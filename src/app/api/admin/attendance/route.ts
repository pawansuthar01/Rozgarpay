import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "attendanceDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const userId = searchParams.get("userId");
    const search = searchParams.get("search") || "";

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

    // Build where clause
    const where: any = {
      companyId: admin.company.id,
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

    if (startDate && endDate) {
      where.attendanceDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.attendanceDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.attendanceDate = {
        lte: new Date(endDate),
      };
    } else {
      // Default to last 30 days
      where.attendanceDate = {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      };
    }

    // Get total count
    const total = await prisma.attendance.count({ where });

    // Get records with pagination and sorting
    const records = await prisma.attendance.findMany({
      where,
      include: {
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
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get stats
    const statsResult = await prisma.attendance.groupBy({
      by: ["status"],
      where,
      _count: true,
    });

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

    // Daily trends for bar chart
    const dateRange =
      startDate && endDate
        ? { gte: new Date(startDate), lte: new Date(endDate) }
        : { gte: new Date(new Date().setDate(new Date().getDate() - 30)) };

    const dailyTrendsResult = await prisma.attendance.groupBy({
      by: ["attendanceDate"],
      where: {
        ...where,
        attendanceDate: dateRange,
      },
      _count: true,
      orderBy: {
        attendanceDate: "asc",
      },
    });

    const dailyTrends = dailyTrendsResult.map((item: any) => ({
      date: item.attendanceDate.toISOString().split("T")[0],
      count: item._count,
    }));

    return NextResponse.json({
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
        dailyTrends,
      },
    });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
