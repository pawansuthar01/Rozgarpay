import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

import { getDate, getISTMonthYear } from "@/lib/attendanceUtils";
import { formatISTDateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const { month: currentMonth, year: currentYear } = getISTMonthYear(now);
    const year = Number(searchParams.get("year")) || currentYear;
    const month = Number(searchParams.get("month")) || currentMonth;

    // 🔒 IST month boundaries → UTC (DB safe)
    const monthStartUTC = getDate(new Date(year, month - 1, 1));
    const monthEndUTC = getDate(new Date(year, month, 1));

    // Get all attendance records for the month
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: monthStartUTC,
          lt: monthEndUTC,
        },
      },

      select: {
        id: true,
        attendanceDate: true,
        punchIn: true,
        punchOut: true,
        status: true,
        workingHours: true,
        overtimeHours: true,
        LateMinute: true,
        isLate: true,
        requiresApproval: true,
        approvalReason: true,
        rejectionReason: true,
        approvedAt: true,
      },

      orderBy: { attendanceDate: "asc" },
    });

    // Create a map of attendance records by IST date
    const attendanceMap = new Map<string, (typeof attendanceRecords)[0]>();
    attendanceRecords.forEach((r) => {
      const istDateStr = formatISTDateKey(r.attendanceDate);
      attendanceMap.set(istDateStr, r);
    });

    // Generate all days in the month (only IST dates)
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayISTDateStr = formatISTDateKey(now);

    const records: Array<{
      id: string;
      date: string;
      punchIn: string | null;
      punchOut: string | null;
      status: string | null;
      workingHours: number | null;
      overtimeHours: number | null;
      lateMinutes: number | null;
      isLate: boolean | null;
      requiresApproval: boolean;
      approvalReason: string | null;
      rejectionReason: string | null;
      approvedAt: string | null;
      hasRecord: boolean;
    }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(year, month - 1, day);
      const dateStr = formatISTDateKey(currentDayDate);

      // Skip future dates (use >= to exclude today if needed for punch-out)
      if (dateStr > todayISTDateStr) continue;

      const attendance = attendanceMap.get(dateStr);

      if (attendance) {
        records.push({
          id: attendance.id,
          date: dateStr,
          punchIn: attendance.punchIn?.toISOString() ?? null,
          punchOut: attendance.punchOut?.toISOString() ?? null,
          status: attendance.status,
          workingHours: attendance.workingHours,
          overtimeHours: attendance.overtimeHours,
          lateMinutes: attendance.LateMinute,
          isLate: attendance.isLate,
          requiresApproval: attendance.requiresApproval,
          approvalReason: attendance.approvalReason,
          rejectionReason: attendance.rejectionReason,
          approvedAt: attendance.approvedAt?.toISOString() ?? null,
          hasRecord: true,
        });
      } else {
        // Day with no attendance record
        records.push({
          id: `no-record-${dateStr}`,
          date: dateStr,
          punchIn: null,
          punchOut: null,
          status: null,
          workingHours: null,
          overtimeHours: null,
          lateMinutes: null,
          isLate: null,
          requiresApproval: false,
          approvalReason: null,
          rejectionReason: null,
          approvedAt: null,
          hasRecord: false,
        });
      }
    }

    const summary = {
      total: records.length,
      pending: records.filter((r) => r.status === "PENDING").length,
      noRecord: records.filter((r) => !r.hasRecord).length,
      presentDays: records.filter((r) => r.status === "APPROVED").length,

      absentDays: records.filter((r) => r.status === "ABSENT").length,

      leaveDays: records.filter((r) => r.status === "LEAVE").length,

      totalWorkingHours: records.reduce(
        (sum, r) => sum + (r.workingHours ?? 0),
        0,
      ),
      totalOvertimeHours: records.reduce(
        (sum, r) => sum + (r.overtimeHours ?? 0),
        0,
      ),
    };
    return NextResponse.json(
      { records, summary },
      {
        headers: {
          "Cache-Control": "private, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Staff attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
