import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";
import { hmToHours } from "@/lib/attendanceUtils";
import { getCurrentTime } from "@/lib/utils";
import { toZonedTime } from "date-fns-tz";

export async function PUT(
  request: NextRequest,
  { params }: { params: { attendanceId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attendanceId } = params;
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

    const finalWorkingHours = hmToHours(workingHours);
    if (finalWorkingHours < 0 || finalWorkingHours > 24) {
      return NextResponse.json(
        { error: "Invalid working hours" },
        { status: 400 },
      );
    }

    if (LateMinute < 0 || LateMinute > 1440) {
      return NextResponse.json(
        { error: "Invalid late minutes" },
        { status: 400 },
      );
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company || !admin.companyId) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId, companyId: admin.companyId },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance not found" },
        { status: 404 },
      );
    }
    // getCurrentTime time is retune same new Date utc time
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
        approvedAt: getCurrentTime(),
      },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
      },
    });

    try {
      // Create audit log
      prisma.auditLog.create({
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
    } catch (error) {}

    // 🔥 Fire-and-forget salary recalculation (non-blocking, production-ready)
    setImmediate(async () => {
      const attendanceLocal = toZonedTime(
        new Date(updatedAttendance.attendanceDate),
        "Asia/Kolkata",
      );
      const month = attendanceLocal.getMonth() + 1;
      const year = attendanceLocal.getFullYear();

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
      } else if (!existingSalary && admin?.companyId) {
        await salaryService.generateSalary({
          userId: updatedAttendance.userId,
          companyId: admin.companyId,
          month,
          year,
        });
      }
    });

    return NextResponse.json({ attendance: updatedAttendance });
  } catch (error) {
    console.error("Attendance update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
