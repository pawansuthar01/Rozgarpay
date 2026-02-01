import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

interface ValidationError {
  field: string;
  message: string;
}

function validateCompanySettings(body: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate time fields (HH:MM format)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (body.shiftStartTime !== undefined) {
    if (
      typeof body.shiftStartTime !== "string" ||
      !timeRegex.test(body.shiftStartTime)
    ) {
      errors.push({
        field: "shiftStartTime",
        message: "Shift start time must be in HH:MM format",
      });
    }
  }

  if (body.shiftEndTime !== undefined) {
    if (
      typeof body.shiftEndTime !== "string" ||
      !timeRegex.test(body.shiftEndTime)
    ) {
      errors.push({
        field: "shiftEndTime",
        message: "Shift end time must be in HH:MM format",
      });
    }
  }

  // Validate numeric fields
  if (body.gracePeriodMinutes !== undefined) {
    const gracePeriod = Number(body.gracePeriodMinutes);
    if (isNaN(gracePeriod) || gracePeriod < 0 || gracePeriod > 120) {
      errors.push({
        field: "gracePeriodMinutes",
        message: "Grace period must be between 0 and 120 minutes",
      });
    }
  }

  if (body.minWorkingHours !== undefined) {
    const minHours = Number(body.minWorkingHours);
    if (isNaN(minHours) || minHours < 0 || minHours > 24) {
      errors.push({
        field: "minWorkingHours",
        message: "Minimum working hours must be between 0 and 24",
      });
    }
  }

  if (body.maxDailyHours !== undefined) {
    const maxHours = Number(body.maxDailyHours);
    if (isNaN(maxHours) || maxHours < 0 || maxHours > 24) {
      errors.push({
        field: "maxDailyHours",
        message: "Maximum daily hours must be between 0 and 24",
      });
    }
  }

  if (body.autoPunchOutBufferMinutes !== undefined) {
    const buffer = Number(body.autoPunchOutBufferMinutes);
    if (isNaN(buffer) || buffer < 0 || buffer > 480) {
      errors.push({
        field: "autoPunchOutBufferMinutes",
        message: "Auto punch out buffer must be between 0 and 480 minutes",
      });
    }
  }

  if (body.overtimeThresholdHours !== undefined) {
    const overtime = Number(body.overtimeThresholdHours);
    if (isNaN(overtime) || overtime < 0 || overtime > 24) {
      errors.push({
        field: "overtimeThresholdHours",
        message: "Overtime threshold must be between 0 and 24 hours",
      });
    }
  }

  // Validate location fields
  if (body.locationLat !== undefined) {
    const lat = Number(body.locationLat);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push({
        field: "locationLat",
        message: "Location latitude must be between -90 and 90",
      });
    }
  }

  if (body.locationLng !== undefined) {
    const lng = Number(body.locationLng);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push({
        field: "locationLng",
        message: "Location longitude must be between -180 and 180",
      });
    }
  }

  if (body.locationRadius !== undefined) {
    const radius = Number(body.locationRadius);
    if (isNaN(radius) || radius <= 0 || radius > 10000) {
      errors.push({
        field: "locationRadius",
        message: "Location radius must be between 0 and 10000 meters",
      });
    }
  }

  return errors;
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
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const body = await request.json();
    console.log(body);
    // Validate input data
    const validationErrors = validateCompanySettings(body);
    console.log(validationErrors);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors[0].message || "Validation failed" },
        { status: 400 },
      );
    }

    // Update company with attendance settings
    const updatedCompany = await prisma.company.update({
      where: { id: admin.company.id },
      data: {
        shiftStartTime: body.shiftStartTime,
        shiftEndTime: body.shiftEndTime,
        gracePeriodMinutes: body.gracePeriodMinutes,
        minWorkingHours: body.minWorkingHours,
        maxDailyHours: body.maxDailyHours,
        autoPunchOutBufferMinutes: body.autoPunchOutBufferMinutes,
        locationLat: body.locationLat,
        locationLng: body.locationLng,
        locationRadius: body.locationRadius,
        overtimeThresholdHours: body.overtimeThresholdHours,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED",
        entity: "COMPANY",
        entityId: admin.company.id,
        meta: {
          type: "ATTENDANCE_SETTINGS_UPDATE",
          updatedFields: Object.keys(body),
        },
      },
    });

    return NextResponse.json({
      company: updatedCompany,
      message: "Attendance settings updated successfully",
    });
  } catch (error) {
    console.error("Company update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      company: admin.company,
    });
  } catch (error) {
    console.error("Company fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
