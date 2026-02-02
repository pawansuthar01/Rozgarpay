import { prisma } from "./prisma";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { convertSeconds } from "./utils";

export interface LocationData {
  lat: number;
  lng: number;
}

export interface CompanySettings {
  shiftStartTime: string;
  shiftEndTime: string;
  gracePeriodMinutes: number;
  minWorkingHours: number;
  maxDailyHours: number;
  autoPunchOutBufferMinutes: number;
  locationLat?: number;
  locationLng?: number;
  locationRadius: number;
  overtimeThresholdHours: number;
  nightPunchInWindowHours: number;
  enableLatePenalty: boolean;
  latePenaltyPerMinute: number;
  enableAbsentPenalty: boolean;
  halfDayThresholdHours: number;
  absentPenaltyPerDay: number;
  pfPercentage: number;
  esiPercentage: number;
}

export async function getCompanySettings(
  companyId: string,
): Promise<CompanySettings> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) throw new Error("Company not found");

  return {
    shiftStartTime: company.shiftStartTime ?? "09:00",
    shiftEndTime: company.shiftEndTime ?? "18:00",
    gracePeriodMinutes: company.gracePeriodMinutes ?? 30,
    minWorkingHours: company.minWorkingHours ?? 4,
    maxDailyHours: company.maxDailyHours ?? 16,
    autoPunchOutBufferMinutes: company.autoPunchOutBufferMinutes ?? 30,
    locationLat: company.locationLat ?? undefined,
    locationLng: company.locationLng ?? undefined,
    locationRadius: company.locationRadius ?? 100,
    overtimeThresholdHours: company.overtimeThresholdHours ?? 2,
    nightPunchInWindowHours: company.nightPunchInWindowHours ?? 2,
    enableLatePenalty: company.enableLatePenalty ?? false,
    latePenaltyPerMinute: company.latePenaltyPerMinute ?? 0,
    enableAbsentPenalty: company.enableAbsentPenalty ?? false,
    halfDayThresholdHours: company.halfDayThresholdHours ?? 4,
    absentPenaltyPerDay: company.absentPenaltyPerDay ?? 0,
    pfPercentage: company.pfPercentage ?? 12,
    esiPercentage: company.esiPercentage ?? 0.75,
  };
}

// ================= TIME HELPERS =================
export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function getDate(nowUtc: Date, timeZone: string = "Asia/Kolkata"): Date {
  // Convert current UTC time → company local time
  const localNow = toZonedTime(nowUtc, timeZone);

  // Base date = local date (00:00)
  const baseDate = new Date(localNow);
  baseDate.setHours(0, 0, 0, 0);

  // Convert local date → UTC before saving to DB
  return fromZonedTime(baseDate, timeZone);
}

// ================= LOCATION =================
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function isLocationValid(
  user: LocationData,
  office: LocationData,
  radius: number,
) {
  return (
    calculateDistance(user.lat, user.lng, office.lat, office.lng) <= radius
  );
}

// ================= PUNCH RULES =================
export function isPunchInAllowed(
  now: Date,
  shiftStart: string,
  shiftEnd: string,
  grace: number,
  timeZone: string = "Asia/Kolkata",
) {
  // Convert the provided instant to the company's local time for comparisons
  const localNow = toZonedTime(now, timeZone);

  const [h, m] = shiftStart.split(":").map(Number);
  const startLocal = new Date(localNow);
  startLocal.setHours(h, m, 0, 0);

  const earlyLocal = new Date(startLocal.getTime() - 30 * 60 * 1000); // 30 minutes early
  const lateLocal = new Date(startLocal.getTime() + grace * 60000); // Grace period in minutes

  // Convert local boundary times back to UTC instants for safe comparison with `now`
  const earlyUtc = fromZonedTime(earlyLocal, timeZone);
  const lateUtc = fromZonedTime(lateLocal, timeZone);
  const startUtc = fromZonedTime(startLocal, timeZone);

  if (now < earlyUtc)
    return { allowed: false, isLate: false, reason: "Too early to punch in." };

  if (now > lateUtc) {
    const lateMin = Math.floor(
      (now.getTime() - lateUtc.getTime()) / (1000 * 60),
    );

    return {
      allowed: true,
      isLate: true,
      reason: "Too late to punch in.",
      lateMin,
    };
  }

  return { allowed: true, isLate: now.getTime() > startUtc.getTime() };
}

export function isPunchOutAllowed(punchIn: Date, min: number, max: number) {
  const hours = (Date.now() - punchIn.getTime()) / 36e5;

  if (hours < min) {
    const remainingMin = Math.ceil((min - hours) * 60);

    return {
      allowed: false,
      reason: `Minimum working hours not met ,You can punch out after ${convertSeconds(remainingMin * 60)}`,
    };
  }
  if (hours > max)
    return {
      allowed: true,
      requiresApproval: true,
      reason: "Exceeded maximum daily hours.",
    };

  return { allowed: true, requiresApproval: false };
}

export function calculateHours(
  punchIn: Date,
  punchOut: Date,
  shiftStart: string,
  shiftEnd: string,
  overtimeThreshold: number,
  customShiftDurationHours?: number,
) {
  const worked = (punchOut.getTime() - punchIn.getTime()) / 36e5;

  const shiftDuration =
    customShiftDurationHours ||
    (timeToMinutes(shiftEnd) - timeToMinutes(shiftStart)) / 60;

  // Overtime starts after regular shift duration
  return {
    workingHours: worked,
    overtimeHours: Math.max(0, worked - shiftDuration - overtimeThreshold),
  };
}
// Simplified - just return today's date
export const getAttendanceBaseDate = () => {
  const now = new Date();
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  return base;
};

export function calculateLateMinutes(
  gracePeriodMinutes: number | null,
  shiftStartTime: string | null,
  punchIn: Date | null,
  isLate: boolean = false,
) {
  if (!isLate || !punchIn || !shiftStartTime) return 0;

  const [h, m] = shiftStartTime.split(":").map(Number);

  const shiftStart = new Date(punchIn);
  shiftStart.setHours(h, m, 0, 0);

  shiftStart.setMinutes(shiftStart.getMinutes() + (gracePeriodMinutes ?? 0));

  const diffMs = punchIn.getTime() - shiftStart.getTime();

  if (diffMs <= 0) return 0;

  return Math.floor(diffMs / (1000 * 60));
}

export function getApprovedWorkingHours(attendance: any, company: any): number {
  // Case 1: Already calculated (normal punch in/out)
  if (attendance.workingHours && attendance.workingHours > 0) {
    return attendance.workingHours;
  }
  // Case 2: Manual approval without punches → full shift hours
  if (company.shiftStartTime && company.shiftEndTime) {
    const [sh, sm] = company.shiftStartTime.split(":").map(Number);
    const [eh, em] = company.shiftEndTime.split(":").map(Number);

    let start = sh * 60 + sm;
    let end = eh * 60 + em;

    // Night shift support
    if (end <= start) end += 1440;

    return Math.round(((end - start) / 60) * 100) / 100;
  }

  // Fallback safety
  return 0;
}
export function hmToHours(value: string | number): number {
  if (typeof value === "number") return value;

  if (!value.includes(":")) return Number(value) || 0;

  const [h, m = "0"] = value.split(":");
  return Math.round((Number(h) + Number(m) / 60) * 100) / 100;
}
