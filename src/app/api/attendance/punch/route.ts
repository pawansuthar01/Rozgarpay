import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

import { Prisma } from "@prisma/client";
import {
  getCompanySettings,
  isLocationValid,
  isPunchInAllowed,
  isPunchOutAllowed,
  calculateHours,
  getDate,
  LocationData,
} from "@/lib/attendanceUtils";
import { notificationManager } from "@/lib/notifications/manager";

import { getCurrentTime } from "@/lib/utils";
import { toZonedTime } from "date-fns-tz";

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

    /* ================= SALARY SETUP CHECK ================= */

    const body = await request.json();

    /* ================= IMAGE ================= */
    if (!body.imageUrl) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }
    const imageUrl: string = body.imageUrl;

    /* ================= LOCATION ================= */
    let location: LocationData | null = null;
    if (body.location) {
      location = {
        lat: body.location.lat,
        lng: body.location.lng,
      };
    }

    /* ================= SETTINGS ================= */
    const settings = await getCompanySettings(companyId);
    const nowUtc = getCurrentTime();
    const nowIst = toZonedTime(nowUtc, "Asia/Kolkata");

    /* ================= ATTENDANCE DATE ================= */
    const attendanceDate = getDate(nowUtc);

    /* ================= FIND REAL OPEN ATTENDANCE ================= */
    let openAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        companyId,
        punchIn: { not: null },
        punchOut: null,
        attendanceDate,
      },
      orderBy: { punchIn: "desc" },
    });

    let attendance;

    /* =====================================================
       ====================== PUNCH OUT =====================
       ===================================================== */
    if (openAttendance) {
      const hoursOpen =
        (nowUtc.getTime() - openAttendance.punchIn!.getTime()) / 36e5;

      if (hoursOpen > 20) {
        // Fixed BUG-005: Set punchOut to current time instead of punchIn time
        await prisma.attendance.update({
          where: { id: openAttendance.id },
          data: {
            punchOut: nowUtc,
            workingHours: 0,
            status: "REJECTED",
            approvalReason:
              "System auto-closed stale attendance (no punch-out for >20 hours)",
          },
        });

        openAttendance = null;
      }
    }

    if (openAttendance) {
      //location system in not ready now

      // if (settings.locationLat && settings.locationLng) {
      //   if (!location) {
      //     return NextResponse.json(
      //       { error: "Location is required for punch-out." },
      //       { status: 400 },
      //     );
      //   }

      //   const valid = isLocationValid(
      //     location,
      //     { lat: settings.locationLat, lng: settings.locationLng },
      //     settings.locationRadius,
      //   );

      //   if (!valid) {
      //     return NextResponse.json(
      //       { error: "You are not within company premises." },
      //       { status: 400 },
      //     );
      //   }
      // }

      // Punch-out rules
      const punchOutCheck = isPunchOutAllowed(
        openAttendance.punchIn!,
        settings.minWorkingHours,
        settings.maxDailyHours,
      );

      if (!punchOutCheck.allowed) {
        return NextResponse.json(
          { error: punchOutCheck.reason },
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

      await prisma.auditLog.create({
        data: {
          userId,
          action: "UPDATED",
          entity: "ATTENDANCE",
          entityId: attendance.id,
          meta: { type: "PUNCH_OUT" },
        },
      });
    } else {
      /* =====================================================
       ====================== PUNCH IN ======================
       ===================================================== */
      // ❌ Prevent double punch-in
      const existingOpen = await prisma.attendance.findFirst({
        where: {
          userId,
          companyId,
          punchOut: null,
          attendanceDate: attendanceDate,
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

      const punchInCheck = isPunchInAllowed(
        nowIst,
        settings.shiftStartTime,
        settings.shiftEndTime,
        settings.gracePeriodMinutes,
      );

      if (!punchInCheck.allowed) {
        return NextResponse.json(
          { error: punchInCheck.reason },
          { status: 400 },
        );
      }
      //location system in not ready now
      // if (settings.locationLat && settings.locationLng) {
      //   if (!location) {
      //     return NextResponse.json(
      //       { error: "Location is required for punch-in." },
      //       { status: 400 },
      //     );
      //   }

      //   const valid = isLocationValid(
      //     location,
      //     { lat: settings.locationLat, lng: settings.locationLng },
      //     settings.locationRadius,
      //   );

      //   if (!valid) {
      //     return NextResponse.json(
      //       { error: "You are not within company premises." },
      //       { status: 400 },
      //     );
      //   }
      // }
      attendance = await prisma.attendance.create({
        data: {
          userId,
          companyId,
          attendanceDate,
          LateMinute: punchInCheck.lateMin ?? 0,
          punchIn: nowUtc,
          punchInLocation: location
            ? JSON.stringify(location)
            : Prisma.JsonNull,
          punchInImageUrl: imageUrl,
          isLate: punchInCheck.isLate,
          status: "PENDING",
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: "CREATED",
          entity: "ATTENDANCE",
          entityId: attendance.id,
          meta: { type: "PUNCH_IN" },
        },
      });
    }

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
