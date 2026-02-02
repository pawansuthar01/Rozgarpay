import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

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
    const monthParam = searchParams.get("month");
    let month: number, year: number;

    if (monthParam && monthParam.includes("-")) {
      // Handle YYYY-MM format
      [year, month] = monthParam.split("-").map(Number);
    } else {
      // Fallback to separate parameters or current date
      month = parseInt(
        searchParams.get("month") ||
          (getDate(new Date()).getMonth() + 1).toString(),
      );
      year = parseInt(
        searchParams.get("year") ||
          getDate(new Date()).getFullYear().toString(),
      );
    }

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

    // Get attendance records for the specified month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

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

    // Calculate summary
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (record) => record.status === "APPROVED",
    ).length;
    const absentDays = attendanceRecords.filter(
      (record) => record.status === "ABSENT",
    ).length;
    const lateDays = attendanceRecords.filter(
      (record) => record.isLate && record.status === "APPROVED",
    ).length;

    return NextResponse.json({
      user,
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendanceRecords: attendanceRecords.map((record) => ({
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
      })),
    });
  } catch (error) {
    console.error("Admin user attendance GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
