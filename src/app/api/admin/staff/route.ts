import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";
import { toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

// Cache for 1 minute
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=120";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    let limit = Math.max(
      1,
      Math.min(parseInt(searchParams.get("limit") || "10") || 10, 100),
    );
    const status = searchParams.get("status");
    const attendanceStatus = searchParams.get("attendanceStatus");
    const search = searchParams.get("search");

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

    const companyId = admin.companyId;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      companyId,
      role: "STAFF",
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const now = new Date();
    const today = getDate(now);
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = getDate(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // PARALLEL QUERIES: Run independent queries concurrently
    const [total, staff, todayAttendanceStats, staffCounts] = await Promise.all(
      [
        // Total count
        prisma.user.count({ where }),

        // Get paginated staff with selective fields
        prisma.user.findMany({
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),

        // Today's attendance stats
        prisma.attendance.groupBy({
          by: ["status"],
          where: {
            companyId,
            attendanceDate: today,
            user: { role: "STAFF" },
          },
          _count: true,
        }),

        // Staff counts
        prisma.user.groupBy({
          by: ["status"],
          where: { companyId, role: "STAFF" },
          _count: true,
        }),
      ],
    );

    // Get today's attendance for each staff member
    const staffIds = staff.map((s) => s.id);
    const todayAttendances = await prisma.attendance.findMany({
      where: {
        userId: { in: staffIds },
        attendanceDate: today,
      },
      select: {
        userId: true,
        status: true,
        punchIn: true,
        punchOut: true,
      },
    });

    // Create a map for quick lookup
    const attendanceMap = new Map<string, any>();
    for (const att of todayAttendances) {
      attendanceMap.set(att.userId, att);
    }

    // Enrich staff with today's attendance
    const staffWithAttendance = staff.map((member) => ({
      ...member,
      todayAttendance: attendanceMap.get(member.id) || null,
    }));

    // Filter by attendance status if specified
    let filteredStaff = staffWithAttendance;
    if (attendanceStatus) {
      if (attendanceStatus === "NOT_MARKED") {
        filteredStaff = staffWithAttendance.filter((s) => !s.todayAttendance);
      } else {
        filteredStaff = staffWithAttendance.filter(
          (s) => s.todayAttendance?.status === attendanceStatus,
        );
      }
    }

    // Calculate stats
    const todayPresent =
      todayAttendanceStats.find((s) => s.status === "APPROVED")?._count || 0;
    const todayPending =
      todayAttendanceStats.find((s) => s.status === "PENDING")?._count || 0;

    const activeStaff =
      staffCounts.find((s) => s.status === "ACTIVE")?._count || 0;
    const totalStaff = staffCounts.reduce((sum, s) => sum + s._count, 0);

    const response = NextResponse.json({
      staff: filteredStaff,
      pagination: {
        page,
        limit,
        total: filteredStaff.length,
        totalPages: Math.ceil(filteredStaff.length / limit),
      },
      stats: {
        totalStaff,
        activeStaff,
        todayPresent,
        todayPending,
        todayAttendanceRate:
          totalStaff > 0 ? Math.round((todayPresent / totalStaff) * 100) : 0,
      },
    });

    response.headers.set("Cache-Control", CACHE_CONTROL);
    return response;
  } catch (error) {
    console.error("Staff fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
