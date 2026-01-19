import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

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

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

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
        email: true,
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

    const attendedUserIds = new Set(staffWithAttendance.map((a) => a.userId));

    // Filter staff without attendance
    const missingAttendanceStaff = allStaff.filter(
      (staff) => !attendedUserIds.has(staff.id),
    );

    return NextResponse.json({
      date,
      missingStaff: missingAttendanceStaff,
      totalMissing: missingAttendanceStaff.length,
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
    const { userId, date, punchIn, punchOut, reason } = body;

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

    const attendanceDate = new Date(date);
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

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId,
        companyId: admin.company.id,
        attendanceDate,
        punchIn: punchIn ? new Date(punchIn) : null,
        punchOut: punchOut ? new Date(punchOut) : null,
        status: "APPROVED", // Auto-approve manual entries
        approvedBy: session.user.id,
        approvedAt: new Date(),
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
