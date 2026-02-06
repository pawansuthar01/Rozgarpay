import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import authOptions from "@/lib/auth";
import { getApprovedWorkingHours, getDate } from "@/lib/attendanceUtils";

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

    const startOfDay = getDate(new Date(`${date}T00:00:00`));
    const endOfDay = getDate(new Date(`${date}T23:59:59.999`));

    // PARALLEL QUERIES: Fetch staff and attendance concurrently
    const [allStaff, staffWithAttendance] = await Promise.all([
      // Get all staff in the company
      prisma.user.findMany({
        where: {
          companyId: admin.companyId,
          role: "STAFF",
          status: "ACTIVE",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      }),

      // Get staff who have attendance records for the date
      prisma.attendance.findMany({
        where: {
          companyId: admin.companyId,
          attendanceDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          userId: true,
        },
      }),
    ]);

    // Find staff without attendance (client-side filtering for small datasets)
    const attendedUserIds = new Set(staffWithAttendance.map((a) => a.userId));
    const missingAttendanceStaff = allStaff.filter(
      (staff) => !attendedUserIds.has(staff.id),
    );

    // Apply pagination
    const total = missingAttendanceStaff.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStaff = missingAttendanceStaff.slice(startIndex, endIndex);

    // Build response with caching headers
    const response = NextResponse.json({
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

    // Cache for 30 seconds (data changes when staff is marked)
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );

    return response;
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
    attendanceDate.setHours(0, 0, 0, 0);

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
    let workingHours =
      status === "ABSENT" || status === "LEAVE"
        ? 0
        : status === "APPROVED"
          ? getApprovedWorkingHours(existingAttendance as any, admin.company)
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
        user: { select: { firstName: true, lastName: true } },
      },
    });

    // Create audit log (fire-and-forget)
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
      .catch(console.error);

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
