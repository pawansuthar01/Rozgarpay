import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";
import { notificationManager } from "@/lib/notifications/manager";
import { getDate } from "@/lib/attendanceUtils";
import { toZonedTime } from "date-fns-tz";
import { getCurrentTime } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["MANAGER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();

    if (!["APPROVED", "REJECTED", "ABSENT", "LEAVE"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const attendanceId = params.id;
    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance || attendance.companyId !== companyId) {
      return NextResponse.json(
        { error: "Attendance not found" },
        { status: 404 },
      );
    }

    // Validate workflow rules
    if (attendance.status === status) {
      return NextResponse.json(
        { error: "Attendance already has this status" },
        { status: 400 },
      );
    }

    // Workflow restrictions per spec:
    // - APPROVED cannot be changed to REJECTED, but can be changed to ABSENT
    // - REJECTED cannot be changed back to APPROVED
    if (attendance.status === "APPROVED" && status === "REJECTED") {
      return NextResponse.json(
        {
          error:
            "Approved attendance cannot be rejected. You can mark it as absent instead.",
        },
        { status: 400 },
      );
    }

    if (attendance.status === "REJECTED" && status === "APPROVED") {
      return NextResponse.json(
        { error: "Rejected attendance cannot be approved." },
        { status: 400 },
      );
    }

    // ✅ Update attendance with approval info
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status,
        approvedBy: session.user.id,
        approvedAt: getCurrentTime(),
      },
    });

    // ✅ Generic audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action:
            status === "APPROVED"
              ? "APPROVED"
              : status === "REJECTED"
                ? "REJECTED"
                : "UPDATED",
          entity: "ATTENDANCE",
          entityId: attendanceId,
          meta: {
            previousStatus: attendance.status,
            newStatus: status,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Don't fail the request if audit log fails
    }

    // ✅ Send notification to STAFF
    if (attendance.punchOut == null) {
      notificationManager.sendNotification({
        userId: attendance.userId,
        type: "staff_manual",
        data: {
          title: "Attendance Update",
          message: `Your attendance has been ${status.toLowerCase()}.`,
        },
        channels: ["push"],
      });
    }

    // Auto-recalculate salary for the current month if attendance status affects it
    try {
      // Derive month/year in Asia/Kolkata from stored UTC timestamp
      const attendanceLocal = toZonedTime(
        new Date(updatedAttendance.attendanceDate),
        "Asia/Kolkata",
      );
      const currentMonth = attendanceLocal.getMonth() + 1;
      const currentYear = attendanceLocal.getFullYear();

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
          `Auto-recalculating salary for user ${updatedAttendance.userId} - ${currentMonth}/${currentYear} due to status change to ${status}`,
        );

        setImmediate(async () => {
          try {
            await salaryService.recalculateSalary(existingSalary.id);
          } catch (err) {
            console.error("Async salary recalculation failed:", err);
          }
        });
      }
    } catch (salaryError) {
      console.error("Error during auto salary recalculation:", salaryError);
      // Don't fail the attendance update if salary recalculation fails
    }

    return NextResponse.json({ attendance: updatedAttendance });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
