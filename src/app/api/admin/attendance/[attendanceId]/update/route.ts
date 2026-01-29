import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "../../../../auth/[...nextauth]/route";

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
    const {
      overtimeHours = 0,
      workingHours = 0,
      LateMinute = 0,
      approvalReason = "N/A",
      shiftDurationHours = 0,
    } = body as {
      overtimeHours: number;
      workingHours: number;
      LateMinute: number;
      approvalReason: string;
      shiftDurationHours: number;
    };

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

    // Update attendance with additional details
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        overtimeHours:
          overtimeHours !== undefined && overtimeHours !== null
            ? Math.round(parseFloat(overtimeHours.toString()) * 100) / 100
            : undefined,
        workingHours:
          workingHours !== undefined && workingHours !== null
            ? Math.round(parseFloat(workingHours.toString()) * 100) / 100
            : undefined,
        LateMinute: LateMinute !== null ? LateMinute : 0,
        shiftDurationHours:
          shiftDurationHours !== undefined && shiftDurationHours !== null
            ? Math.round(parseFloat(shiftDurationHours.toString()) * 100) / 100
            : undefined,
        isLate: LateMinute !== null && LateMinute > 0,
        approvalReason: approvalReason || undefined,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
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
          updates: {
            overtimeHours,
            workingHours,
            shiftDurationHours,
            LateMinute,
            approvalReason,
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
    console.error("Attendance update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
