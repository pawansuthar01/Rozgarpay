import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import authOptions from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
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

    const targetDate = getDate(new Date(`${date}T00:00:00`));
    const startOfDay = getDate(new Date(`${date}T00:00:00`));
    const endOfDay = getDate(new Date(`${date}T23:59:59.999`));

    // Get all staff in the company
    const allStaff = await prisma.user.findMany({
      where: {
        companyId: admin.company.id,
        role: "STAFF",
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    // Get staff who have attendance records for the date
    const staffWithAttendance = await prisma.attendance.findMany({
      where: {
        companyId: admin.company.id,
        attendanceDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        userId: true,
      },
    });

    const attendedUserIds = new Set(
      staffWithAttendance.map((a: any) => a.userId),
    );

    // Filter staff without attendance
    const missingAttendanceStaff = allStaff.filter(
      (staff: any) => !attendedUserIds.has(staff.id),
    );

    // Apply pagination
    const total = missingAttendanceStaff.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStaff = missingAttendanceStaff.slice(startIndex, endIndex);

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

    // Verify user belongs to admin's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== admin.company.id) {
      return NextResponse.json(
        { error: "User not found in your company" },
        { status: 404 },
      );
    }

    const attendanceDate = getDate(new Date(date));
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        userId_companyId_attendanceDate: {
          userId,
          companyId: admin.company.id,
          attendanceDate,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "Attendance already exists for this date" },
        { status: 400 },
      );
    }

    // Calculate working hours based on status
    let workingHours: number | undefined;
    if (status === "APPROVED") {
      // Calculate from shift start to end
      if (admin.company.shiftStartTime && admin.company.shiftEndTime) {
        const start = getDate(
          new Date(`1970-01-01T${admin.company.shiftStartTime}:00`),
        );
        const end = getDate(
          new Date(`1970-01-01T${admin.company.shiftEndTime}:00`),
        );
        let diffMs = end.getTime() - start.getTime();
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
        workingHours = Math.max(0, diffMs / (1000 * 60 * 60)); // hours
      }
    } else if (status === "ABSENT" || status === "LEAVE") {
      workingHours = 0;
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId,
        companyId: admin.company.id,
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
    });

    // Create audit log
    await prisma.auditLog.create({
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
