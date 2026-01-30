import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
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

    // Get all salaries for the user (limit to last 24 months for performance)
    const salaries = await prisma.salary.findMany({
      where: {
        userId,
        companyId,
      },
      include: {
        breakdowns: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 24, // Limit to 2 years of data
    });

    // Get all salary ledgers for calculations (limit for performance)
    const salaryLedgers = await prisma.salaryLedger.findMany({
      where: {
        userId,
        companyId,
        salaryId: {
          in: salaries.map((s) => s.id),
        },
      },
      include: {
        salary: {
          select: {
            month: true,
            year: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200, // Limit transactions for performance
    });

    // Calculate totals from salary ledgers
    let totalOwed = 0; // Amount company owes to staff
    let totalOwe = 0; // Amount staff owes to company

    // Group ledgers by salary
    const ledgersBySalary = salaryLedgers.reduce(
      (acc, ledger) => {
        if (!acc[ledger.salaryId]) {
          acc[ledger.salaryId] = [];
        }
        acc[ledger.salaryId].push(ledger);
        return acc;
      },
      {} as Record<string, typeof salaryLedgers>,
    );

    const monthlyBreakdown = salaries.map((salary) => {
      const ledgers = ledgersBySalary[salary.id] || [];
      const payments = ledgers.filter((l) => l.type === "PAYMENT");
      const recoveries = ledgers.filter((l) => l.type === "RECOVERY");
      const deductions = ledgers.filter((l) => l.type === "DEDUCTION");

      const given = payments.reduce((sum, p) => sum + p.amount, 0);
      const taken =
        recoveries.reduce((sum, r) => sum + Math.abs(r.amount), 0) +
        deductions.reduce((sum, d) => sum + Math.abs(d.amount), 0);

      // Calculate balance for this salary
      const salaryBalance = salaryService.calculateSalaryBalance(
        salary,
        ledgers,
      );

      // Include all salaries in totals for complete financial picture
      totalOwed += Math.max(0, salaryBalance);
      totalOwe += Math.max(0, -salaryBalance);

      return {
        month: salary.month,
        year: salary.year,
        given,
        taken,
        net: salary.netAmount,
        balance: salaryBalance,
        status: salary.status,
      };
    });

    // Calculate pending amount (current balance)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const currentSalary = salaries.find(
      (s) => s.month === currentMonth && s.year === currentYear,
    );
    const currentLedgers = currentSalary
      ? ledgersBySalary[currentSalary.id] || []
      : [];
    const currentBalance = currentSalary
      ? salaryService.calculateSalaryBalance(currentSalary, currentLedgers)
      : 0;
    const currentMonthData = currentSalary
      ? {
          owed: Math.max(0, currentBalance),
          owe: Math.max(0, -currentBalance),
          net: currentBalance,
        }
      : { owed: 0, owe: 0, net: 0 };

    // Get recent transactions (last 50 for better visibility)
    const recentTransactions = salaryLedgers.slice(0, 50).map((ledger) => ({
      id: ledger.id,
      type: ledger.type,
      description: ledger.reason,
      amount: ledger.amount,
      date: ledger.createdAt.toISOString().split("T")[0],
      salaryMonth: ledger.salary
        ? `${ledger.salary.month}/${ledger.salary.year}`
        : null,
    }));

    const pendingAmount = totalOwed - totalOwe;

    return NextResponse.json({
      totalOwed,
      totalOwe,
      pendingAmount,
      monthlyBreakdown,
      recentTransactions,
      currentMonth: currentMonthData,
    });
  } catch (error) {
    console.error("Staff salary overview GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
