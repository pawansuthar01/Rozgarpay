import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
import { generateSalaryReportPDFBuffer } from "@/lib/salaryReportGenerator";
import { getDate } from "@/lib/attendanceUtils";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

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

    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: getDate(new Date(startDate)),
              lte: getDate(new Date(endDate)),
            },
          }
        : {};

    // Total payout
    const totalPayoutResult = await prisma.salary.aggregate({
      where: {
        companyId: admin.company.id,
        status: "PAID",
        ...dateFilter,
      },
      _sum: {
        netAmount: true,
      },
    });

    const totalPayout = totalPayoutResult._sum.netAmount || 0;

    // Staff count
    const staffCount = await prisma.user.count({
      where: {
        companyId: admin.company.id,
        role: "STAFF",
      },
    });

    // Monthly breakdown
    const monthlyResult = await prisma.salary.groupBy({
      by: ["month", "year"],
      where: {
        companyId: admin.company.id,
        status: "PAID",
        ...dateFilter,
      },
      _sum: {
        netAmount: true,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    const monthlyBreakdown = monthlyResult.map((m) => ({
      month: `${new Date(m.year, m.month - 1).toLocaleString("default", { month: "short" })} ${m.year}`,
      amount: m._sum.netAmount || 0,
    }));

    // Staff breakdown
    const staff = await prisma.user.findMany({
      where: {
        companyId: admin.company.id,
        role: "STAFF",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    const staffBreakdown = await Promise.all(
      staff.map(async (user) => {
        const totalAmountResult = await prisma.salary.aggregate({
          where: {
            userId: user.id,
            status: "PAID",
            ...dateFilter,
          },
          _sum: {
            netAmount: true,
          },
        });

        return {
          userId: user.id,
          user,
          totalAmount: totalAmountResult._sum.netAmount || 0,
        };
      }),
    );

    // Sort by total amount desc
    staffBreakdown.sort((a, b) => b.totalAmount - a.totalAmount);

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStaff = staffBreakdown.slice(startIndex, endIndex);
    const totalPages = Math.ceil(staffBreakdown.length / limit);

    // Status distribution
    const statusResult = await prisma.salary.groupBy({
      by: ["status"],
      where: {
        companyId: admin.company.id,
        ...dateFilter,
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

    if (format === "pdf") {
      // Generate PDF report
      const pdfData = {
        company: admin.company,
        totalPayout,
        staffCount,
        monthlyBreakdown,
        staffBreakdown: staffBreakdown, // Include all staff for PDF
        statusDistribution,
        generatedBy: session.user,
        dateRange: {
          startDate,
          endDate,
        },
      };

      const pdfBuffer = generateSalaryReportPDFBuffer(pdfData);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=salary-report-${getDate(new Date()).toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    return NextResponse.json({
      totalPayout,
      staffCount,
      monthlyBreakdown,
      staffBreakdown: paginatedStaff,
      statusDistribution,
      totalPages,
    });
  } catch (error) {
    console.error("Salary report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
