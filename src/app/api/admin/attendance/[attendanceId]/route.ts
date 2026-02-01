import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";
import { getApprovedWorkingHours } from "@/lib/attendanceUtils";

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

    const attendanceTrends = trends.map((t: any) => ({
      date: t.attendanceDate.toISOString().split("T")[0],
      count: t._count,
    }));

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

    // Cast to ValidStatus type after validation
    const validStatus = status as ValidStatus;

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
    // Calculate working hours based on status
    let workingHours =
      validStatus === "ABSENT" || validStatus === "LEAVE"
        ? 0
        : validStatus === "APPROVED"
          ? getApprovedWorkingHours(attendance, admin.company)
          : (attendance.workingHours ?? 0);
    console.log(workingHours);
    // Update attendance status
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: validStatus,
        approvedBy: validStatus === "APPROVED" ? session.user.id : undefined,
        approvedAt: validStatus === "APPROVED" ? new Date() : undefined,
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
            to: validStatus,
          },
        },
      },
    });
    try {
      const attendanceDate = new Date(updatedAttendance.attendanceDate);
      const month = attendanceDate.getMonth() + 1;
      const year = attendanceDate.getFullYear();

      // Check if salary record exists
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
        // Recalculate existing salary
        await salaryService.recalculateSalary(existingSalary.id);
      } else if (!existingSalary) {
        // Create new salary record for this month
        // Use the already fetched admin data instead of redefining
        if (admin?.companyId) {
          await salaryService.generateSalary({
            userId: updatedAttendance.userId,
            companyId: admin.companyId,
            month,
            year,
          });
        }
      }
    } catch (err) {
      console.error("Auto salary recalculation failed:", err);
      // ❗ salary fail hone par attendance update fail nahi hona chahiye
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
