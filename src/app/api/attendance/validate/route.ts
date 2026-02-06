import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

import {
  getCompanySettings,
  isPunchInAllowed,
  isPunchOutAllowed,
  getDate,
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
    const punchType = body.type; // "in" or "out"

    if (!punchType || !["in", "out"].includes(punchType)) {
      return NextResponse.json(
        { error: "Invalid punch type" },
        { status: 400 },
      );
    }

    const settings = await getCompanySettings(companyId);
    const nowUtc = getCurrentTime();
    const today = getDate(nowUtc);
    const startOfDay = today;
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);
    // Check if user already has an active attendance session
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        companyId,
        punchIn: { not: null },
        punchOut: null,
        attendanceDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { punchIn: "desc" },
    });

    // PUNCH IN VALIDATION
    if (punchType === "in") {
      // Check for existing open attendance (double punch-in prevention)

      if (openAttendance) {
        return NextResponse.json(
          {
            error:
              "You already have an active attendance session. Please check it.",
            code: "ALREADY_PUNCHED_IN",
          },
          { status: 400 },
        );
      }

      // Check punch-in allowed based on time
      const punchInCheck = isPunchInAllowed(
        nowUtc,
        settings.shiftStartTime,
        settings.shiftEndTime,
        settings.gracePeriodMinutes,
      );

      if (!punchInCheck.allowed) {
        return NextResponse.json(
          {
            error: punchInCheck.reason,
            code: "PUNCH_IN_NOT_ALLOWED",
          },
          { status: 400 },
        );
      }

      // Validation passed - return success with data needed for punch
      return NextResponse.json({
        valid: true,
        punchType: "in",
        lateMinutes: punchInCheck.lateMin ?? 0,
        isLate: punchInCheck.isLate,
        message: "Punch in allowed",
      });
    }

    // PUNCH OUT VALIDATION
    if (punchType === "out") {
      if (!openAttendance) {
        return NextResponse.json(
          {
            error: "No active attendance session found. Please punch in first.",
            code: "NO_ACTIVE_SESSION",
          },
          { status: 400 },
        );
      }

      // Check if attendance is stale (>20 hours)
      const hoursOpen =
        (nowUtc.getTime() - openAttendance.punchIn!.getTime()) / 36e5;
      if (hoursOpen > 20) {
        return NextResponse.json(
          {
            error:
              "Your attendance session has expired (>20 hours). Please contact admin.",
            code: "SESSION_EXPIRED",
          },
          { status: 400 },
        );
      }

      // Check punch-out allowed based on time worked
      const punchOutCheck = isPunchOutAllowed(
        nowUtc,
        openAttendance.punchIn!,
        settings.minWorkingHours,
        settings.maxDailyHours,
      );

      if (!punchOutCheck.allowed) {
        return NextResponse.json(
          {
            error: punchOutCheck.reason,
            code: "PUNCH_OUT_NOT_ALLOWED",
          },
          { status: 400 },
        );
      }

      // Validation passed - return success with data needed for punch
      return NextResponse.json({
        valid: true,
        punchType: "out",
        attendanceId: openAttendance.id,
        message: "Punch out allowed",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Punch validation error:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
