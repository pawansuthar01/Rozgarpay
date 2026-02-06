import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import authOptions from "@/lib/auth";
import {
  getApprovedWorkingHours,
  getDate,
  getISTMonthYear,
} from "@/lib/attendanceUtils";
import { salaryService } from "@/lib/salaryService";
import { toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    let limit = Math.max(
      1,
      Math.min(parseInt(searchParams.get("limit") || "10") || 10, 100),
    );

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 },
      );
    }

    // Get admin's company with minimal fields
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id, companyId: session.user.companyId },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const attendanceDate = getDate(new Date(date));
    const startOfDay = attendanceDate;
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get users who HAVE attendance for this date
    const usersWithAttendance = await prisma.attendance.findMany({
      where: {
        companyId: admin.companyId,
        attendanceDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { userId: true },
    });

    const attendedUserIds = new Set(usersWithAttendance.map((a) => a.userId));

    // OPTIMIZED: Get count and paginated results for users WITHOUT attendance
    const [total, paginatedStaff] = await Promise.all([
      prisma.user.count({
        where: {
          companyId: admin.companyId,
          role: "STAFF",
          status: "ACTIVE",
          id: { notIn: Array.from(attendedUserIds) },
        },
      }),
      prisma.user.findMany({
        where: {
          companyId: admin.companyId,
          role: "STAFF",
          status: "ACTIVE",
          id: { notIn: Array.from(attendedUserIds) },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { firstName: "asc" },
      }),
    ]);

    return NextResponse.json({
      date,
      missingStaff: paginatedStaff,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      totalMissing: total,
    });
  } catch (error) {
    console.error("Missing attendance fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      date,
      status = "APPROVED",
      punchIn,
      punchOut,
      reason,
    } = body;

    if (!userId || !date) {
      return NextResponse.json(
        { error: "User ID and date are required" },
        { status: 400 },
      );
    }

    // Get admin's company with minimal fields
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyId: true,
        company: { select: { shiftStartTime: true, shiftEndTime: true } },
      },
    });

    if (!admin?.companyId || !admin.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    // Verify user belongs to admin's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true },
    });

    if (!user || user.companyId !== admin.companyId) {
      return NextResponse.json(
        { error: "User not found in your company" },
        { status: 404 },
      );
    }

    const attendanceDate = getDate(new Date(date));

    // Check if attendance already exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        userId_companyId_attendanceDate: {
          userId,
          companyId: admin.companyId,
          attendanceDate,
        },
      },
      select: { id: true },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "Attendance already exists for this date" },
        { status: 400 },
      );
    }

    // Calculate working hours based on status
    const workingHours =
      status === "ABSENT" || status === "LEAVE"
        ? 0
        : status === "APPROVED"
          ? getApprovedWorkingHours(null, admin.company)
          : 0;

    // Create attendance record with minimal fields
    const attendance = await prisma.attendance.create({
      data: {
        userId,
        companyId: admin.companyId,
        attendanceDate,
        punchIn: punchIn ? new Date(punchIn) : null,
        punchOut: punchOut ? new Date(punchOut) : null,
        status: status as any,
        workingHours:
          workingHours !== undefined
            ? Math.round(workingHours * 100) / 100
            : undefined,
        approvedBy: status === "APPROVED" ? session.user.id : undefined,
        approvedAt: status === "APPROVED" ? new Date() : undefined,
        approvalReason: reason || "Manual entry by admin",
      },
      select: {
        id: true,
        attendanceDate: true,
        status: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Fire salary recalculation in background (non-blocking)
    setImmediate(async () => {
      try {
        const { month, year } = getISTMonthYear(attendance.attendanceDate);

        const existingSalary = await prisma.salary.findUnique({
          where: {
            userId_month_year: {
              userId: attendance.user.id,
              month,
              year,
            },
          },
        });

        if (
          existingSalary &&
          existingSalary.status === "PENDING" &&
          !existingSalary.lockedAt
        ) {
          await salaryService.recalculateSalary(existingSalary.id);
        } else if (!existingSalary && admin?.companyId) {
          await salaryService.generateSalary({
            userId: attendance.user.id,
            companyId: admin.companyId,
            month,
            year,
          });
        }
      } catch (error) {
        console.error("Background salary recalculation error:", error);
      }
    });

    // Fire-and-forget audit log
    prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "CREATED",
          entity: "Attendance",
          entityId: attendance.id,
          meta: {
            reason: "Manual attendance entry for missing record",
            targetUserId: userId,
            date,
          },
        },
      })
      .catch((error) => {
        console.error("Audit log creation error:", error);
      });

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Manual attendance creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
