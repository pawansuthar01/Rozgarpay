import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";
import { toZonedTime } from "date-fns-tz";

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

    // Get current month/year in Asia/Kolkata for efficient filtering
    const nowLocal = toZonedTime(new Date(), "Asia/Kolkata");
    const currentMonth = nowLocal.getMonth() + 1;
    const currentYear = nowLocal.getFullYear();

    // Optimized: Single query to get salaries with required data
    // Only fetch last 24 months of data
    const salaries = await prisma.salary.findMany({
      where: {
        userId,
        companyId,
      },
      select: {
        id: true,
        month: true,
        year: true,
        netAmount: true,
        status: true,
        createdAt: true,
        breakdowns: {
          select: {
            type: true,
            amount: true,
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
          take: 50, // Limit ledgers per salary for performance
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 24, // Limit to 2 years of data
    });

    // Calculate totals and monthly breakdown
    let totalOwed = 0;
    let totalOwe = 0;

    const monthlyBreakdown = salaries.map((salary) => {
      // Calculate balance from ledgers
      let salaryBalance = 0;
      const payments = salary.ledger.filter((l) => l.type === "PAYMENT");
      const recoveries = salary.ledger.filter(
        (l) => l.type === "RECOVERY" || l.type === "DEDUCTION",
      );

      const given = payments.reduce((sum, p) => sum + p.amount, 0);
      const taken = recoveries.reduce((sum, r) => sum + Math.abs(r.amount), 0);

      // Calculate balance
      const totalCredits = given;
      const totalDebits = salary.netAmount + taken;
      salaryBalance = totalCredits - totalDebits;

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

    // Get current month data
    const currentSalary = salaries.find(
      (s) => s.month === currentMonth && s.year === currentYear,
    );
    const currentLedgers = currentSalary?.ledger || [];
    const currentBalance = currentSalary
      ? currentLedgers
          .filter((l) => l.type === "PAYMENT")
          .reduce((sum, p) => sum + p.amount, 0) -
        (currentSalary.netAmount +
          currentLedgers
            .filter((l) => l.type === "RECOVERY" || l.type === "DEDUCTION")
            .reduce((sum, r) => sum + Math.abs(r.amount), 0))
      : 0;

    const currentMonthData = currentSalary
      ? {
          owed: Math.max(0, currentBalance),
          owe: Math.max(0, -currentBalance),
          net: currentBalance,
        }
      : { owed: 0, owe: 0, net: 0 };

    // Get recent transactions (flatten from all salary ledgers)
    const allLedgers = salaries.flatMap((s) =>
      s.ledger.map((l) => ({
        ...l,
        salaryMonth: `${s.month}/${s.year}`,
      })),
    );
    const recentTransactions = allLedgers
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50)
      .map((ledger) => ({
        id: ledger.id,
        type: ledger.type,
        description: ledger.reason,
        amount: ledger.amount,
        date: ledger.createdAt.toISOString().split("T")[0],
        salaryMonth: ledger.salaryMonth,
      }));

    const pendingAmount = totalOwed - totalOwe;

    return NextResponse.json(
      {
        totalOwed,
        totalOwe,
        pendingAmount,
        monthlyBreakdown,
        recentTransactions,
        currentMonth: currentMonthData,
      },
      {
        headers: {
          // Cache at CDN for 2 minutes, browser for 1 minute
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
