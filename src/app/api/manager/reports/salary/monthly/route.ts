import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Date range required" },
        { status: 400 },
      );
    }

    // Get monthly salary summary
    const monthlySalaries = await prisma.$queryRaw`
      SELECT
        s.month,
        s.year,
        COUNT(s.id) as total_salaries,
        SUM(s.grossAmount) as total_gross,
        SUM(s.netAmount) as total_net,
        COUNT(CASE WHEN s.status = 'PAID' THEN 1 END) as paid_salaries,
        COUNT(CASE WHEN s.status != 'PAID' THEN 1 END) as pending_salaries,
        ROUND(AVG(s.netAmount), 2) as average_salary
      FROM "Salary" s
      WHERE s."companyId" = ${companyId}
        AND s."createdAt" >= ${new Date(dateFrom)}
        AND s."createdAt" <= ${new Date(dateTo)}
      GROUP BY s.month, s.year
      ORDER BY s.year DESC, s.month DESC
    `;

    const summary = (monthlySalaries as any[]).map((month) => ({
      month: month.month,
      year: month.year,
      totalSalaries: parseInt(month.total_salaries),
      totalAmount: parseFloat(month.total_net),
      paidSalaries: parseInt(month.paid_salaries),
      pendingSalaries: parseInt(month.pending_salaries),
      averageSalary: parseFloat(month.average_salary) || 0,
    }));

    return NextResponse.json({
      summary,
    });
  } catch (error) {
    console.error("Manager monthly salary report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
