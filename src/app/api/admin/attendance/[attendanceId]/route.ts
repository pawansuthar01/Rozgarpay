import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";
import { getDate, getISTMonthYear } from "@/lib/attendanceUtils";
import { getCurrentTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { attendanceId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attendanceId } = params;

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

    // Fetch the attendance record with selective fields
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        companyId: admin.companyId,
      },
      select: {
        id: true,
        attendanceDate: true,
        punchIn: true,
        punchOut: true,
        status: true,
        workingHours: true,
        isLate: true,
        overtimeHours: true,
        userId: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        approvedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 },
      );
    }

    // Fetch user's attendance trends (last 30 days)
    const userTrends = await prisma.attendance.groupBy({
      by: ["attendanceDate"],
      where: {
        userId: attendance.userId,
        attendanceDate: {
          gte: getDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        },
      },
      _count: true,
      orderBy: {
        attendanceDate: "asc",
      },
    });

    const attendanceTrends = userTrends.map((t) => ({
      date: t.attendanceDate.toISOString().split("T")[0],
      count: t._count,
    }));

    // Build response with caching headers
    const response = NextResponse.json({
      attendance,
      charts: {
        attendanceTrends,
      },
    });

    return response;
  } catch (error) {
    console.error("Attendance detail fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.companyId ||
      (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attendanceId } = params;
    const body = await request.json();
    const { status } = body;

    // Define valid status types
    const validStatuses = ["APPROVED", "REJECTED", "ABSENT", "LEAVE"] as const;
    type ValidStatus = (typeof validStatuses)[number];

    if (!status || !validStatuses.includes(status as ValidStatus)) {
      return NextResponse.json(
        {
          error: "Invalid status. Must be APPROVED, REJECTED, ABSENT, or LEAVE",
        },
        { status: 400 },
      );
    }

    const validStatus = status as ValidStatus;

    // Get admin's company with minimal fields
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyId: true,
        company: {
          select: {
            shiftStartTime: true,
            shiftEndTime: true,
            maxDailyHours: true,
          },
        },
      },
    });

    if (!admin?.companyId || !admin.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    // Get attendance
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId, companyId: admin.companyId },
      select: {
        status: true,
        workingHours: true,
        userId: true,
        attendanceDate: true,
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance not found" },
        { status: 404 },
      );
    }

    if (attendance.status === validStatus) {
      return NextResponse.json(
        { error: "Attendance already in this status" },
        { status: 400 },
      );
    }

    // Prevent rejecting approved attendance
    if (attendance.status === "APPROVED" && validStatus === "REJECTED") {
      return NextResponse.json(
        { error: "Cannot reject approved attendance" },
        { status: 400 },
      );
    }

    // Calculate working hours
    let workingHours =
      validStatus === "ABSENT" || validStatus === "LEAVE"
        ? 0
        : validStatus === "APPROVED"
          ? await salaryService.getShiftHoursForSalary(
              admin.company.shiftStartTime,
              admin.company.shiftEndTime,
              admin.company.maxDailyHours,
            )
          : (attendance.workingHours ?? 0);

    // Update attendance status
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: validStatus,
        approvedBy: validStatus === "APPROVED" ? session.user.id : undefined,
        approvedAt: validStatus === "APPROVED" ? getCurrentTime() : undefined,
        workingHours:
          workingHours !== undefined
            ? Math.round(workingHours * 100) / 100
            : undefined,
      },
      select: {
        id: true,
        status: true,
        workingHours: true,
        overtimeHours: true,
        userId: true,
        attendanceDate: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    // Create audit log (fire-and-forget)
    prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "Attendance",
          entityId: attendanceId,
          meta: {
            statusUpdate: {
              from: attendance.status,
              to: validStatus,
            },
          },
        },
      })
      .catch(console.error);

    // Fire-and-forget salary recalculation
    setImmediate(async () => {
      try {
        const { month, year } = getISTMonthYear(
          updatedAttendance.attendanceDate,
        );
        const existingSalary = await prisma.salary.findUnique({
          where: {
            userId_month_year: {
              userId: updatedAttendance.userId,
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
        } else if (!existingSalary && admin.companyId) {
          await salaryService.generateSalary({
            userId: updatedAttendance.userId,
            companyId: admin.companyId,
            month,
            year,
          });
        }
      } catch (error) {
        console.error("Background salary recalculation failed:", error);
      }
    });

    return NextResponse.json({ attendance: updatedAttendance });
  } catch (error) {
    console.error("Attendance status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
