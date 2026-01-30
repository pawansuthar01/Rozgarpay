import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    // Get all users in the company
    const users = await prisma.user.findMany({
      where: {
        companyId,
        role: "STAFF",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Get current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Calculate summary for each staff member
    const staffSummaries = await Promise.all(
      users.map(async (user) => {
        // Get all salaries for this user
        const salaries = await prisma.salary.findMany({
          where: {
            userId: user.id,
            companyId,
          },
          include: {
            breakdowns: true,
          },
        });

        let totalOwed = 0;
        let totalOwe = 0;

        salaries.forEach((salary) => {
          totalOwed += Math.max(0, salary.netAmount);
          totalOwe += Math.max(0, -salary.netAmount);
        });

        const pendingAmount = totalOwed - totalOwe;

        // Get last salary info
        const lastSalary = salaries.sort(
          (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month),
        )[0];

        // Calculate current month totals
        const currentMonthSalary = salaries.find(
          (s) => s.month === currentMonth && s.year === currentYear,
        );
        const totalPaidThisMonth =
          currentMonthSalary?.breakdowns
            .filter((b) => b.type === "PAYMENT")
            .reduce((sum, b) => sum + b.amount, 0) || 0;

        const totalRecoveredThisMonth =
          currentMonthSalary?.breakdowns
            .filter((b) => b.type === "RECOVERY" || b.type === "DEDUCTION")
            .reduce((sum, b) => sum + Math.abs(b.amount), 0) || 0;

        return {
          userId: user.id,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          },
          totalOwed,
          totalOwe,
          pendingAmount,
          lastSalaryMonth: lastSalary?.month || 0,
          lastSalaryYear: lastSalary?.year || 0,
          lastSalaryStatus: lastSalary?.status || "N/A",
          totalPaidThisMonth,
          totalRecoveredThisMonth,
        };
      }),
    );

    // Calculate company-wide totals
    const totalStaff = staffSummaries.length;
    const totalOwed = staffSummaries.reduce(
      (sum, staff) => sum + staff.totalOwed,
      0,
    );
    const totalOwe = staffSummaries.reduce(
      (sum, staff) => sum + staff.totalOwe,
      0,
    );
    const netPending = totalOwed - totalOwe;

    // Current month company totals
    const currentMonthTotalPaid = staffSummaries.reduce(
      (sum, staff) => sum + staff.totalPaidThisMonth,
      0,
    );
    const currentMonthTotalRecovered = staffSummaries.reduce(
      (sum, staff) => sum + staff.totalRecoveredThisMonth,
      0,
    );
    const currentMonthNet = currentMonthTotalPaid - currentMonthTotalRecovered;

    return NextResponse.json({
      totalStaff,
      totalOwed,
      totalOwe,
      netPending,
      staffSummaries,
      currentMonth: {
        totalPaid: currentMonthTotalPaid,
        totalRecovered: currentMonthTotalRecovered,
        netAmount: currentMonthNet,
      },
    });
  } catch (error) {
    console.error("Admin salary monitoring GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
