import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { salaryService } from "@/lib/salaryService";

export async function GET(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attendanceId } = await params;

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

    // Fetch the attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        companyId: admin.company.id,
      },
      include: {
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
            phone: true,
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

    // Fetch user's attendance trends for chart (last 30 days)
    const trends = await prisma.attendance.groupBy({
      by: ["attendanceDate"],
      where: {
        userId: attendance.userId,
        attendanceDate: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
      },
      _count: true,
      orderBy: {
        attendanceDate: "asc",
      },
    });

    const attendanceTrends = trends.map((t) => ({
      date: t.attendanceDate.toISOString().split("T")[0],
      count: t._count,
    }));

    // Audit history: for now, just the current record, but can expand if audit model exists
    const auditHistory = [attendance];

    return NextResponse.json({
      attendance,
      auditHistory,
      charts: {
        attendanceTrends,
      },
    });
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
      (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attendanceId } = await params;
    const body = await request.json();
    const { status } = body;

    if (
      !status ||
      !["APPROVED", "REJECTED", "ABSENT", "LEAVE"].includes(status)
    ) {
      return NextResponse.json(
        {
          error: "Invalid status. Must be APPROVED, REJECTED, ABSENT, or LEAVE",
        },
        { status: 400 },
      );
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

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance || attendance.companyId !== admin.company.id) {
      return NextResponse.json(
        { error: "Attendance not found" },
        { status: 404 },
      );
    }

    // Prevent rejecting approved attendance
    if (attendance.status === "APPROVED" && status === "REJECTED") {
      return NextResponse.json(
        { error: "Cannot reject approved attendance" },
        { status: 400 },
      );
    }

    // Calculate working hours based on status
    let workingHours: number | undefined;
    if (status === "APPROVED") {
      // Calculate from shift start to end
      if (admin.company.shiftStartTime && admin.company.shiftEndTime) {
        const start = new Date(`1970-01-01T${admin.company.shiftStartTime}:00`);
        const end = new Date(`1970-01-01T${admin.company.shiftEndTime}:00`);
        const diffMs = end.getTime() - start.getTime();
        workingHours = Math.max(0, diffMs / (1000 * 60 * 60)); // hours
      }
    } else if (status === "ABSENT" || status === "LEAVE") {
      workingHours = 0;
    }

    // Update attendance status
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: status as any,
        approvedBy: status === "APPROVED" ? session.user.id : undefined,
        approvedAt: status === "APPROVED" ? new Date() : undefined,
        workingHours:
          workingHours !== undefined
            ? Math.round(workingHours * 100) / 100
            : undefined,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED",
        entity: "Attendance",
        entityId: attendanceId,
        meta: {
          statusUpdate: {
            from: attendance.status,
            to: status,
          },
        },
      },
    });

    // Auto-recalculate salary for the current month if attendance affects it
    try {
      const attendanceDate = new Date(updatedAttendance.attendanceDate);
      const currentMonth = attendanceDate.getMonth() + 1;
      const currentYear = attendanceDate.getFullYear();

      // Check if there's a salary record for this month that needs recalculation
      const existingSalary = await prisma.salary.findUnique({
        where: {
          userId_month_year: {
            userId: updatedAttendance.userId,
            month: currentMonth,
            year: currentYear,
          },
        },
      });

      if (
        existingSalary &&
        existingSalary.status !== "PAID" &&
        !existingSalary.lockedAt
      ) {
        console.log(
          `Auto-recalculating salary for user ${updatedAttendance.userId} - ${currentMonth}/${currentYear}`,
        );

        const recalcResult = await salaryService.recalculateSalary(
          existingSalary.id,
        );

        if (!recalcResult.success) {
          console.error(
            "Failed to auto-recalculate salary:",
            recalcResult.error,
          );
          // Don't fail the attendance update if salary recalculation fails
        } else {
          console.log(
            `Successfully auto-recalculated salary for user ${updatedAttendance.userId}`,
          );
        }
      }
    } catch (salaryError) {
      console.error("Error during auto salary recalculation:", salaryError);
      // Don't fail the attendance update if salary recalculation fails
    }

    return NextResponse.json({ attendance: updatedAttendance });
  } catch (error) {
    console.error("Attendance status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
