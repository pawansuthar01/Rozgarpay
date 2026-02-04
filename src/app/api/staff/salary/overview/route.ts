import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

// Helper function to calculate balance correctly
// Positive = Company owes employee (receivable)
// Negative = Employee owes company (payable)
function calculateSalaryBalance(
  netAmount: number,
  ledger: Array<{ type: string; amount: number }>,
): number {
  const payments = ledger
    .filter((l) => l.type === "PAYMENT")
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  // Balance = netAmount - payments
  // If netAmount > payments, company owes employee (positive)
  // If netAmount < payments, employee owes company (negative)
  const balance = netAmount - payments;
  return Math.round(balance * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    // Get current month/year in Asia/Kolkata for efficient filtering
    const nowLocal = toZonedTime(new Date(), "Asia/Kolkata");
    const currentMonth = nowLocal.getMonth() + 1;
    const currentYear = nowLocal.getFullYear();

    // Optimized: Single query to get salaries with required data
    const salaries = await prisma.salary.findMany({
      where: {
        userId,
        companyId,
      },
      select: {
        id: true,
        month: true,
        year: true,
        grossAmount: true,
        netAmount: true,
        status: true,
        createdAt: true,
        breakdowns: {
          select: {
            type: true,
            amount: true,
            description: true,
          },
        },
        ledger: {
          select: {
            id: true,
            type: true,
            amount: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 24,
    });

    // Calculate totals and monthly breakdown
    let totalOwed = 0;
    let totalOwe = 0;
    let totalGross = 0;
    let totalPaid = 0;
    let totalDeductions = 0;

    const monthlyBreakdown = salaries.map((salary) => {
      // Calculate balance: netAmount - payments
      const payments = salary.ledger
        .filter((l) => l.type === "PAYMENT")
        .reduce((sum, l) => sum + (l.amount || 0), 0);

      const balance = calculateSalaryBalance(salary.netAmount, salary.ledger);

      // Get gross earnings from breakdowns
      const earnings = salary.breakdowns
        .filter((b) => ["BASE_SALARY", "OVERTIME"].includes(b.type))
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      // Get all deductions from ledger
      const ledgerDeductions = salary.ledger
        .filter((l) => l.type === "DEDUCTION" || l.type === "RECOVERY")
        .reduce((sum, l) => sum + Math.abs(l.amount || 0), 0);

      // Track totals
      totalGross += earnings;
      totalPaid += payments;
      totalDeductions += ledgerDeductions;

      // Include all salaries in totals
      totalOwed += Math.max(0, balance);
      totalOwe += Math.max(0, -balance);

      return {
        month: salary.month,
        year: salary.year,
        gross: earnings,
        deductions: ledgerDeductions,
        paid: payments,
        balance,
        net: salary.netAmount,
        status: salary.status,
      };
    });

    // Get current month data
    const currentSalary = salaries.find(
      (s) => s.month === currentMonth && s.year === currentYear,
    );

    // Calculate current month balance
    const currentBalance = currentSalary
      ? calculateSalaryBalance(currentSalary.netAmount, currentSalary.ledger)
      : 0;

    // Get earnings breakdown for current month
    const currentEarnings =
      currentSalary?.breakdowns.filter((b) =>
        ["BASE_SALARY", "OVERTIME"].includes(b.type),
      ) || [];

    const currentDeductions =
      currentSalary?.ledger.filter(
        (l) => l.type === "DEDUCTION" || l.type === "RECOVERY",
      ) || [];

    const currentPayments =
      currentSalary?.ledger.filter((l) => l.type === "PAYMENT") || [];

    const currentMonthData = currentSalary
      ? {
          gross: currentEarnings.reduce((sum, b) => sum + (b.amount || 0), 0),
          deductions: currentDeductions.reduce(
            (sum, l) => sum + Math.abs(l.amount || 0),
            0,
          ),
          paid: currentPayments.reduce((sum, l) => sum + (l.amount || 0), 0),
          balance: currentBalance,
          owed: Math.max(0, currentBalance),
          owe: Math.max(0, -currentBalance),
          net: currentSalary.netAmount,
          earnings: currentEarnings,
          payments: currentPayments,
          extraDeductions: currentDeductions,
        }
      : {
          gross: 0,
          deductions: 0,
          paid: 0,
          balance: 0,
          owed: 0,
          owe: 0,
          net: 0,
          earnings: [],
          payments: [],
          extraDeductions: [],
        };

    // Get recent transactions
    const allLedgers = salaries.flatMap((s) =>
      s.ledger.map((l) => ({
        ...l,
        salaryMonth: `${s.month}/${s.year}`,
      })),
    );
    const recentTransactions = allLedgers
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 50)
      .map((ledger) => ({
        id: ledger.id,
        type: ledger.type,
        description: ledger.reason,
        amount: ledger.amount,
        date: new Date(ledger.createdAt).toISOString().split("T")[0],
        salaryMonth: ledger.salaryMonth,
      }));

    return NextResponse.json(
      {
        totalOwed,
        totalOwe,
        totalGross,
        totalPaid,
        totalDeductions,
        pendingAmount: totalOwed - totalOwe,
        monthlyBreakdown,
        recentTransactions,
        currentMonth: currentMonthData,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Staff salary overview GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
