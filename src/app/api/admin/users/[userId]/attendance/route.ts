import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { format, fromZonedTime, toZonedTime } from "date-fns-tz";

const TZ = "Asia/Kolkata";

function parseISTStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d, 0, 0, 0, 0);
  return fromZonedTime(local, TZ); // IST → UTC
}

function parseISTEnd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d, 23, 59, 59, 999);
  return fromZonedTime(local, TZ); // IST → UTC
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const companyId = session.user.companyId;
    const { searchParams } = new URL(request.url);

    // Get date range from query params
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const monthParam = searchParams.get("month"); // Keep for backward compatibility

    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    // Get user details
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let startDate: Date;
    let endDate: Date;
    let year: number;
    let month: number;

    if (startDateParam && endDateParam) {
      startDate = parseISTStart(startDateParam);
      endDate = parseISTEnd(endDateParam);

      const [y, m] = startDateParam.split("-").map(Number);
      year = y;
      month = m;
    } else if (monthParam && monthParam.includes("-")) {
      [year, month] = monthParam.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();

      startDate = parseISTStart(`${year}-${String(month).padStart(2, "0")}-01`);
      endDate = parseISTEnd(
        `${year}-${String(month).padStart(2, "0")}-${lastDay}`,
      );
    } else {
      const nowIST = toZonedTime(new Date(), TZ);
      year = nowIST.getFullYear();
      month = nowIST.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();

      startDate = parseISTStart(`${year}-${String(month).padStart(2, "0")}-01`);
      endDate = parseISTEnd(
        `${year}-${String(month).padStart(2, "0")}-${lastDay}`,
      );
    }

    // Fetch attendance records within the date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId,
        companyId,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        attendanceDate: "asc",
      },
      include: {
        company: { select: { shiftStartTime: true, gracePeriodMinutes: true } },
      },
    });

    // Create a map of attendance records by date
    const attendanceByDate = new Map();
    attendanceRecords.forEach((record) => {
      const dateKey = format(
        toZonedTime(record.attendanceDate, "Asia/Kolkata"),
        "yyyy-MM-dd",
      );
      attendanceByDate.set(dateKey, record);
    });

    // Generate all days in the date range
    const allDaysRecords = [];
    const indiaTimezone = "Asia/Kolkata";

    // Calculate days in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, "yyyy-MM-dd");

      if (attendanceByDate.has(dateKey)) {
        // Use existing record
        const record = attendanceByDate.get(dateKey);
        allDaysRecords.push({
          id: record.id,
          attendanceDate: record.attendanceDate,
          status: record.status,
          punchIn: record.punchIn ? record.punchIn : null,
          punchOut: record.punchOut ? record.punchOut : null,
          workingHours: record.workingHours,
          isLate: record.isLate,
          isLateMinutes: record.LateMinute,
          punchOutImageUrl: record.punchOutImageUrl,
          punchInImageUrl: record.punchInImageUrl,
          overtimeHours: record.overtimeHours,
          shiftDurationHours: record.shiftDurationHours,
        });
      } else {
        // Create absent record for missing dates
        allDaysRecords.push({
          id: `no-Marked-${dateKey}`,
          attendanceDate: toZonedTime(currentDate, indiaTimezone).toISOString(),
          status: "NO_MARKED",
          punchIn: null,
          punchOut: null,
          workingHours: 0,
          isLate: false,
          isLateMinutes: 0,
          punchOutImageUrl: null,
          punchInImageUrl: null,
          overtimeHours: 0,
          shiftDurationHours: undefined,
        });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log("All days records:", allDaysRecords.length);
    // Calculate summary
    const totalDays = allDaysRecords.length;
    const presentDays = allDaysRecords.filter(
      (record) => record.status === "PRESENT" || record.status === "APPROVED",
    ).length;
    const absentDays = allDaysRecords.filter(
      (record) => record.status === "ABSENT",
    ).length;
    const noMarkedDays = allDaysRecords.filter(
      (record) => record.status === "NO_MARKED",
    ).length;
    const lateDays = allDaysRecords.filter(
      (record) =>
        record.status === "LATE" ||
        (record.isLate &&
          (record.status === "PRESENT" || record.status === "APPROVED")),
    ).length;

    const totalWorkingHours = attendanceRecords.reduce(
      (sum, record) => sum + (record.workingHours || 0),
      0,
    );
    return NextResponse.json({
      user,
      totalDays,
      noMarkedDays,
      presentDays,
      absentDays,
      lateDays,
      totalWorkingHours,
      attendanceRecords: allDaysRecords,
    });
  } catch (error) {
    console.error("Admin user attendance GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
