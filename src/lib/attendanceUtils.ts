import { prisma } from "./prisma";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

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
  };
}

// ================= TIME HELPERS =================
export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isNightShift(start: string, end: string): boolean {
  return timeToMinutes(end) < timeToMinutes(start);
}

export function getAttendanceDateForShift(
  shiftStart: string,
  shiftEnd: string,
  nowUtc: Date,
  timeZone: string = "Asia/Kolkata",
): Date {
  // Convert current UTC time → company local time
  const localNow = toZonedTime(nowUtc, timeZone);

  // Base date = local date (00:00)
  const baseDate = new Date(localNow);
  baseDate.setHours(0, 0, 0, 0);

  // Shift start time on same local date
  const [h, m] = shiftStart.split(":").map(Number);
  const shiftStartLocal = new Date(baseDate);
  shiftStartLocal.setHours(h, m, 0, 0);

  // 🌙 Night shift logic
  if (isNightShift(shiftStart, shiftEnd) && localNow < shiftStartLocal) {
    baseDate.setDate(baseDate.getDate() - 1);
  }

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
  nightWindow: number,
) {
  const start = new Date(now);
  const [h, m] = shiftStart.split(":").map(Number);
  start.setHours(h, m, 0, 0);

  const early = new Date(start.getTime() - 30 * 60 * 1000);
  const late = isNightShift(shiftStart, shiftEnd)
    ? new Date(start.getTime() + nightWindow * 3600000)
    : new Date(start.getTime() + grace * 60000);

  if (now < early)
    return { allowed: false, isLate: false, reason: "Too early to punch in." };

  if (now > late)
    return { allowed: false, isLate: true, reason: "Too late to punch in." };

  return { allowed: true, isLate: now > start };
}

export function isPunchOutAllowed(punchIn: Date, min: number, max: number) {
  const hours = (Date.now() - punchIn.getTime()) / 36e5;

  if (hours < min)
    return { allowed: false, reason: "Minimum working hours not met." };

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
) {
  const worked = (punchOut.getTime() - punchIn.getTime()) / 36e5;
  const shiftDuration = isNightShift(shiftStart, shiftEnd)
    ? (24 * 60 - timeToMinutes(shiftStart) + timeToMinutes(shiftEnd)) / 60
    : (timeToMinutes(shiftEnd) - timeToMinutes(shiftStart)) / 60;

  const overtimeStart = shiftDuration + overtimeThreshold;

  return {
    workingHours: worked,
    overtimeHours: Math.max(0, worked - overtimeStart),
  };
}
export const getAttendanceBaseDate = (companySettings: any) => {
  const now = new Date();
  if (!companySettings) {
    return now;
  }
  if (
    companySettings &&
    !isNightShift(companySettings.shiftStartTime, companySettings.shiftEndTime)
  ) {
    return now;
  }
  const [h, m] = companySettings.shiftStartTime.split(":").map(Number);
  const shiftStart = new Date(now);
  shiftStart.setHours(h, m, 0, 0);

  const base = new Date(now);
  if (now < shiftStart) base.setDate(base.getDate() - 1);
  base.setHours(0, 0, 0, 0);
  return base;
};
