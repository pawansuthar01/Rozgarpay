import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
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
      user: {
        companyId: admin.company.id,
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

    // Get total count
    const total = await prisma.salary.count({ where });

    // Get records
    const records = await prisma.salary.findMany({
      where,
      include: {
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
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get stats
    const statsResult = await prisma.salary.groupBy({
      by: ["status"],
      where,
      _count: true,
      _sum: {
        netAmount: true,
      },
    });

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

    // Monthly totals (for the selected year or current)
    const selectedYear = year || new Date().getFullYear();
    const monthlyResult = await prisma.salary.groupBy({
      by: ["month"],
      where: {
        ...where,
        year: selectedYear,
      },
      _sum: {
        netAmount: true,
      },
      orderBy: {
        month: "asc",
      },
    });

    const monthlyTotals = monthlyResult.map((m) => ({
      month: new Date(selectedYear, m.month - 1).toLocaleString("default", {
        month: "short",
      }),
      amount: m._sum.netAmount || 0,
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
        monthlyTotals,
      },
    });
  } catch (error) {
    console.error("Salary fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
