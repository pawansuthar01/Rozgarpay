import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    let limit = parseInt(searchParams.get("limit") || "10") || 10;
    limit = Math.max(1, Math.min(limit, 100));
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "attendanceDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const userId = searchParams.get("userId");
    const search = searchParams.get("search") || "";

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

    // Build where clause
    const where: any = {
      companyId,
      user: {
        role: "STAFF",
      },
    };

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.user = {
        ...where.user,
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Date range filter - default to last 30 days
    if (startDate && endDate) {
      where.attendanceDate = {
        gte: getDate(new Date(startDate)),
        lte: getDate(new Date(endDate)),
      };
    } else if (startDate) {
      where.attendanceDate = {
        gte: getDate(new Date(startDate)),
      };
    } else if (endDate) {
      where.attendanceDate = {
        lte: getDate(new Date(endDate)),
      };
    } else {
      where.attendanceDate = {
        gte: getDate(
          new Date(
            getDate(new Date()).setDate(getDate(new Date()).getDate() - 30),
          ),
        ),
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // FAST QUERIES: Only essential data
    const [records, statsResult] = await Promise.all([
      // Records with selective field fetching
      prisma.attendance.findMany({
        where,
        select: {
          id: true,
          attendanceDate: true,
          punchIn: true,
          punchOut: true,
          punchInImageUrl: true,
          punchOutImageUrl: true,
          status: true,
          workingHours: true,
          isLate: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),

      // Stats - minimal groupBy (no count query for speed)
      prisma.attendance.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
    ]);

    // Calculate total from groupBy results
    const total = statsResult.reduce((sum, s) => sum + (s._count || 0), 0);

    // Process stats
    const stats = {
      totalRecords: total,
      pending:
        statsResult.find((s: any) => s.status === "PENDING")?._count || 0,
      approved:
        statsResult.find((s: any) => s.status === "APPROVED")?._count || 0,
      rejected:
        statsResult.find((s: any) => s.status === "REJECTED")?._count || 0,
      absent: statsResult.find((s: any) => s.status === "ABSENT")?._count || 0,
      leave: statsResult.find((s: any) => s.status === "LEAVE")?._count || 0,
    };

    // Status distribution for pie chart
    const statusDistribution = [
      { name: "Approved", value: stats.approved, color: "#10B981" },
      { name: "Absent", value: stats.absent, color: "#F59E0B" },
      { name: "Pending", value: stats.pending, color: "#8B5CF6" },
      { name: "Rejected", value: stats.rejected, color: "#EF4444" },
    ];

    // Build response with caching headers
    const response = NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
      charts: {
        statusDistribution,
        // Daily trends removed for faster loading
        dailyTrends: [],
      },
    });

    // Cache for 15 seconds, stale-while-revalidate for 1 minute
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=15, stale-while-revalidate=60",
    );

    return response;
  } catch (error) {
    console.error("Attendance fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
