import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

import { Prisma } from "@prisma/client";
import {
  getCompanySettings,
  calculateHours,
  getDate,
  LocationData,
} from "@/lib/attendanceUtils";

import { getCurrentTime } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.companyId || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const body = await request.json();

    // IMAGE - only upload after validation
    if (!body.imageUrl) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }
    const imageUrl: string = body.imageUrl;

    // VALIDATION DATA from validate endpoint
    const validation = body.validation;
    if (!validation || !validation.valid) {
      return NextResponse.json(
        { error: "Validation required first" },
        { status: 400 },
      );
    }

    // LOCATION
    let location: LocationData | null = null;
    if (body.location) {
      location = {
        lat: body.location.lat,
        lng: body.location.lng,
      };
    }

    const nowUtc = getCurrentTime();
    const settings = await getCompanySettings(companyId);

    let attendance;

    // PUNCH OUT
    if (validation.punchType === "out" && validation.attendanceId) {
      const openAttendance = await prisma.attendance.findUnique({
        where: { id: validation.attendanceId },
      });

      if (!openAttendance) {
        return NextResponse.json(
          { error: "Attendance session not found" },
          { status: 400 },
        );
      }

      const punchOutTime = nowUtc;

      const { workingHours, overtimeHours } = calculateHours(
        openAttendance.punchIn!,
        punchOutTime,
        settings.shiftStartTime,
        settings.shiftEndTime,
        settings.overtimeThresholdHours,
        openAttendance.shiftDurationHours || undefined,
      );

      attendance = await prisma.attendance.update({
        where: { id: openAttendance.id },
        data: {
          punchOutImageUrl: imageUrl,
          punchOut: punchOutTime,
          punchOutLocation: location
            ? JSON.stringify(location)
            : Prisma.JsonNull,
          workingHours,
          overtimeHours,
        },
      });
      try {
        prisma.auditLog.create({
          data: {
            userId,
            action: "UPDATED",
            entity: "ATTENDANCE",
            entityId: attendance.id,
            meta: { type: "PUNCH_OUT" },
          },
        });
      } catch (_) {}
    }
    // PUNCH IN
    else if (validation.punchType === "in") {
      const attendanceDate = getDate(nowUtc);

      // Double-check no existing open attendance
      const existingOpen = await prisma.attendance.findFirst({
        where: {
          userId,
          companyId,
          punchOut: null,
          attendanceDate,
        },
      });

      if (existingOpen) {
        return NextResponse.json(
          {
            error:
              "You already have an active attendance session. Please check it.",
          },
          { status: 400 },
        );
      }

      attendance = await prisma.attendance.create({
        data: {
          userId,
          companyId,
          attendanceDate,
          LateMinute: validation.lateMinutes ?? 0,
          punchIn: nowUtc,
          punchInLocation: location
            ? JSON.stringify(location)
            : Prisma.JsonNull,
          punchInImageUrl: imageUrl,
          isLate: validation.isLate,
          status: "PENDING",
        },
      });
      try {
        prisma.auditLog.create({
          data: {
            userId,
            action: "CREATED",
            entity: "ATTENDANCE",
            entityId: attendance.id,
            meta: { type: "PUNCH_IN" },
          },
        });
      } catch (_) {}
    } else {
      return NextResponse.json(
        { error: "Invalid punch type" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error("Punch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
