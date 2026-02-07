import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Cache for 5 minutes (company settings rarely change)
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";
function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's company with minimal fields
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: admin.companyId },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        shiftStartTime: true,
        shiftEndTime: true,
        gracePeriodMinutes: true,
        minWorkingHours: true,
        maxDailyHours: true,
        autoPunchOutBufferMinutes: true,
        locationLat: true,
        locationLng: true,
        locationRadius: true,
        overtimeThresholdHours: true,
        nightPunchInWindowHours: true,
        defaultSalaryType: true,
        overtimeMultiplier: true,
        enableLatePenalty: true,
        latePenaltyPerMinute: true,
        enableAbsentPenalty: true,
        halfDayThresholdHours: true,
        absentPenaltyPerDay: true,
        pfPercentage: true,
        esiPercentage: true,
        status: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const response = NextResponse.json({ company });
    response.headers.set("Cache-Control", CACHE_CONTROL);
    return response;
  } catch (error) {
    console.error("Company fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate numeric fields
    const numericFields = [
      "gracePeriodMinutes",
      "minWorkingHours",
      "maxDailyHours",
      "autoPunchOutBufferMinutes",
      "overtimeThresholdHours",
      "nightPunchInWindowHours",
      "overtimeMultiplier",
      "latePenaltyPerMinute",
      "halfDayThresholdHours",
      "absentPenaltyPerDay",
      "pfPercentage",
      "esiPercentage",
    ];
    // Only validate shift times if they are being updated
    if (body.shiftStartTime || body.shiftEndTime) {
      if (!body.shiftStartTime || !body.shiftEndTime) {
        return NextResponse.json(
          { error: "Both shiftStartTime and shiftEndTime are required" },
          { status: 400 },
        );
      }

      if (
        !isValidTime(body.shiftStartTime) ||
        !isValidTime(body.shiftEndTime)
      ) {
        return NextResponse.json(
          { error: "Shift time must be in HH:mm format" },
          { status: 400 },
        );
      }

      const [sh, sm] = body.shiftStartTime.split(":").map(Number);
      const [eh, em] = body.shiftEndTime.split(":").map(Number);

      const start = sh * 60 + sm;
      const end = eh * 60 + em;

      if (end <= start) {
        return NextResponse.json(
          {
            error:
              "Invalid shift time: shiftEndTime must be after shiftStartTime",
          },
          { status: 400 },
        );
      }
      // Don't override maxDailyHours if not being updated
      if (body.maxDailyHours && (end - start) / 60 > body.maxDailyHours) {
        return NextResponse.json(
          { error: "Shift duration exceeds maxDailyHours" },
          { status: 400 },
        );
      }
    }

    for (const field of numericFields) {
      if (body[field] !== undefined) {
        const value = Number(body[field]);
        if (isNaN(value)) {
          return NextResponse.json(
            { error: `${field} must be a valid number` },
            { status: 400 },
          );
        }
      }
    }

    // Validate location fields
    if (
      body.locationLat !== undefined &&
      (body.locationLat < -90 || body.locationLat > 90)
    ) {
      return NextResponse.json(
        { error: "Location latitude must be between -90 and 90" },
        { status: 400 },
      );
    }

    if (
      body.locationLng !== undefined &&
      (body.locationLng < -180 || body.locationLng > 180)
    ) {
      return NextResponse.json(
        { error: "Location longitude must be between -180 and 180" },
        { status: 400 },
      );
    }

    // Update company with only provided fields
    // Build update data conditionally
    const updateData: Record<string, any> = {};

    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.shiftStartTime) updateData.shiftStartTime = body.shiftStartTime;
    if (body.shiftEndTime) updateData.shiftEndTime = body.shiftEndTime;
    if (body.gracePeriodMinutes !== undefined)
      updateData.gracePeriodMinutes = body.gracePeriodMinutes;
    if (body.minWorkingHours !== undefined)
      updateData.minWorkingHours = body.minWorkingHours;
    if (body.maxDailyHours !== undefined)
      updateData.maxDailyHours = body.maxDailyHours;
    if (body.autoPunchOutBufferMinutes !== undefined)
      updateData.autoPunchOutBufferMinutes = body.autoPunchOutBufferMinutes;
    if (body.locationLat !== undefined)
      updateData.locationLat = body.locationLat;
    if (body.locationLng !== undefined)
      updateData.locationLng = body.locationLng;
    if (body.locationRadius !== undefined)
      updateData.locationRadius = body.locationRadius;
    if (body.overtimeThresholdHours !== undefined)
      updateData.overtimeThresholdHours = body.overtimeThresholdHours;
    if (body.nightPunchInWindowHours !== undefined)
      updateData.nightPunchInWindowHours = body.nightPunchInWindowHours;
    if (body.defaultSalaryType)
      updateData.defaultSalaryType = body.defaultSalaryType;
    if (body.overtimeMultiplier !== undefined)
      updateData.overtimeMultiplier = body.overtimeMultiplier;
    if (body.enableLatePenalty !== undefined)
      updateData.enableLatePenalty = body.enableLatePenalty;
    if (body.latePenaltyPerMinute !== undefined)
      updateData.latePenaltyPerMinute = body.latePenaltyPerMinute;
    if (body.enableAbsentPenalty !== undefined)
      updateData.enableAbsentPenalty = body.enableAbsentPenalty;
    if (body.halfDayThresholdHours !== undefined)
      updateData.halfDayThresholdHours = body.halfDayThresholdHours;
    if (body.absentPenaltyPerDay !== undefined)
      updateData.absentPenaltyPerDay = body.absentPenaltyPerDay;
    if (body.pfPercentage !== undefined)
      updateData.pfPercentage = body.pfPercentage;
    if (body.esiPercentage !== undefined)
      updateData.esiPercentage = body.esiPercentage;

    const updatedCompany = await prisma.company.update({
      where: { id: admin.companyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        shiftStartTime: true,
        shiftEndTime: true,
        gracePeriodMinutes: true,
        minWorkingHours: true,
        maxDailyHours: true,
        autoPunchOutBufferMinutes: true,
        locationLat: true,
        locationLng: true,
        locationRadius: true,
        overtimeThresholdHours: true,
        nightPunchInWindowHours: true,
        defaultSalaryType: true,
        overtimeMultiplier: true,
        enableLatePenalty: true,
        latePenaltyPerMinute: true,
        enableAbsentPenalty: true,
        halfDayThresholdHours: true,
        absentPenaltyPerDay: true,
        pfPercentage: true,
        esiPercentage: true,
        status: true,
      },
    });

    // Create audit log (fire-and-forget)
    prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "COMPANY",
          entityId: admin.companyId,
          meta: {
            type: "ATTENDANCE_SETTINGS_UPDATE",
            updatedFields: Object.keys(body),
          },
        },
      })
      .catch(console.error);

    return NextResponse.json({
      company: updatedCompany,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Company update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
