import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";
import { getCurrentTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : null;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : null;
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
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
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      user: {
        companyId,
        role: "STAFF",
      },
    };

    if (month !== null) {
      where.month = month;
    }

    if (year !== null) {
      where.year = year;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.user = {
        ...where.user,
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // PARALLEL QUERIES: Run all independent queries concurrently
    const [total, records, statsResult, monthlyResult] = await Promise.all([
      // Total count
      prisma.salary.count({ where }),

      // Records with selective field fetching
      prisma.salary.findMany({
        where,
        select: {
          id: true,
          month: true,
          year: true,
          grossAmount: true,
          netAmount: true,
          status: true,
          paidAt: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),

      // Stats aggregation
      prisma.salary.groupBy({
        by: ["status"],
        where,
        _count: true,
        _sum: {
          netAmount: true,
        },
      }),

      // Monthly totals
      prisma.salary.groupBy({
        by: ["month"],
        where: {
          ...where,
          year: year || getCurrentTime().getFullYear(),
        },
        _sum: {
          netAmount: true,
        },
        orderBy: {
          month: "asc",
        },
      }),
    ]);

    // Process stats
    const stats = {
      totalRecords: total,
      pending: statsResult.find((s) => s.status === "PENDING")?._count || 0,
      approved: statsResult.find((s) => s.status === "APPROVED")?._count || 0,
      paid: statsResult.find((s) => s.status === "PAID")?._count || 0,
      rejected: statsResult.find((s) => s.status === "REJECTED")?._count || 0,
      totalAmount: statsResult.reduce(
        (sum, s) => sum + (s._sum.netAmount || 0),
        0,
      ),
    };

    // Status distribution
    const statusDistribution = [
      { name: "Pending", value: stats.pending, color: "#F59E0B" },
      { name: "Approved", value: stats.approved, color: "#3B82F6" },
      { name: "Paid", value: stats.paid, color: "#10B981" },
      { name: "Rejected", value: stats.rejected, color: "#EF4444" },
    ];

    // Monthly totals
    const selectedYear = year || getCurrentTime().getFullYear();
    const monthlyTotals = monthlyResult.map((m) => ({
      month: new Date(selectedYear, m.month - 1).toLocaleString("default", {
        month: "short",
      }),
      amount: m._sum.netAmount || 0,
    }));

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
        monthlyTotals,
      },
    });

    // Cache for 30 seconds, stale-while-revalidate for 2 minutes
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=120",
    );

    return response;
  } catch (error) {
    console.error("Salary fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
