import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateSalaryReportPDFBuffer } from "@/lib/salaryReportGenerator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "json";

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );
    const offset = (page - 1) * limit;

    // Admin + company
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

    // ✅ UTC-safe date filter
    let dateWhere: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      dateWhere = {
        createdAt: {
          gte: start,
          lte: end,
        },
      };
    }

    // ✅ Total payout
    const totalPayoutResult = await prisma.salary.aggregate({
      where: {
        companyId: admin.company.id,
        status: "PAID",
        ...dateWhere,
      },
      _sum: { netAmount: true },
    });

    const totalPayout = totalPayoutResult._sum.netAmount || 0;

    // ✅ Staff count
    const staffCount = await prisma.user.count({
      where: { companyId: admin.company.id, role: "STAFF" },
    });

    // ✅ Monthly breakdown
    const monthlyResult = await prisma.salary.groupBy({
      by: ["month", "year"],
      where: {
        companyId: admin.company.id,
        status: "PAID",
        ...dateWhere,
      },
      _sum: { netAmount: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    const monthlyBreakdown = monthlyResult.map((m) => ({
      month: `${new Date(m.year, m.month - 1).toLocaleString("default", {
        month: "short",
      })} ${m.year}`,
      amount: m._sum.netAmount || 0,
    }));

    // ✅ Staff breakdown (single query, paginated)
    const staffBreakdown = await prisma.salary.groupBy({
      by: ["userId"],
      where: {
        companyId: admin.company.id,
        status: "PAID",
        ...dateWhere,
      },
      _sum: { netAmount: true },
      orderBy: { _sum: { netAmount: "desc" } },
      skip: offset,
      take: limit,
    });

    const users = await prisma.user.findMany({
      where: { id: { in: staffBreakdown.map((s) => s.userId) } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    const staffMap = new Map(
      users.map((u) => [
        u.id,
        {
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          phone: u.phone ?? null,
        },
      ]),
    );

    const staffResult: {
      userId: string;
      user: {
        firstName: string | null;
        lastName: string | null;
        phone?: string | null;
      };
      totalAmount: number;
    }[] = staffBreakdown.map((s) => {
      const user = staffMap.get(s.userId);

      return {
        userId: s.userId,
        user: {
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          phone: user?.phone ?? null,
        },
        totalAmount: s._sum.netAmount || 0,
      };
    });

    // ✅ Status distribution
    const statusResult = await prisma.salary.groupBy({
      by: ["status"],
      where: {
        companyId: admin.company.id,
        ...dateWhere,
      },
      _count: true,
    });

    const statusDistribution = [
      {
        name: "Generated",
        value: statusResult.find((s) => s.status === "GENERATED")?._count || 0,
        color: "#3B82F6",
      },
      {
        name: "Pending",
        value: statusResult.find((s) => s.status === "PENDING")?._count || 0,
        color: "#F59E0B",
      },
      {
        name: "Paid",
        value: statusResult.find((s) => s.status === "PAID")?._count || 0,
        color: "#10B981",
      },
    ];

    // ✅ PDF
    if (format === "pdf") {
      const pdfBuffer = generateSalaryReportPDFBuffer({
        company: admin.company,
        totalPayout,
        staffCount,
        monthlyBreakdown,
        staffBreakdown: staffResult,
        statusDistribution,
        generatedBy: session.user,
        dateRange: { startDate, endDate },
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=salary-report-${
            new Date().toISOString().split("T")[0]
          }.pdf`,
        },
      });
    }

    return NextResponse.json({
      totalPayout,
      staffCount,
      monthlyBreakdown,
      staffBreakdown: staffResult,
      statusDistribution,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(staffCount / limit),
      },
    });
  } catch (error) {
    console.error("Salary report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
