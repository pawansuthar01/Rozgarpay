import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { toZonedTime } from "date-fns-tz";
import {
  calculateSalaryBalance,
  calculateTotalPayments,
  calculateTotalRecoveries,
  calculateTotalEarnings,
  roundToTwoDecimals,
  getMonthName,
} from "@/lib/salaryService";

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

    // Get user info including joining date
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { joiningDate: true, firstName: true, lastName: true },
    });

    // Fetch ALL salaries for lifetime calculations (no limit)
    const allSalaries = await prisma.salary.findMany({
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
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // ========================================
    // LIFETIME SUMMARY (Only Salary Ledger)
    // ========================================
    // Formula: Net Position = Total Net Salary - Total Payments - Total Recoveries
    // Only count salaryLedger transactions (PAYMENT, RECOVERY, DEDUCTION)
    let lifetimeTotalNetSalary = 0;
    let lifetimeTotalSalaryPayments = 0;
    let lifetimeTotalRecoveries = 0;

    allSalaries.forEach((salary) => {
      const salaryPayments = calculateTotalPayments(salary.ledger);
      const salaryRecoveries = calculateTotalRecoveries(salary.ledger);

      lifetimeTotalNetSalary += salary.netAmount;
      lifetimeTotalSalaryPayments += salaryPayments;
      lifetimeTotalRecoveries += salaryRecoveries;
    });

    // Net Position: + = Company owes staff, - = Staff owes company
    const lifetimeNetPosition =
      lifetimeTotalNetSalary -
      lifetimeTotalSalaryPayments -
      lifetimeTotalRecoveries;

    // ========================================
    // CURRENT MONTH (Only Salary Ledger)
    // ========================================
    const currentSalary = allSalaries.find(
      (s) => s.month === currentMonth && s.year === currentYear,
    );

    const currentMonthData = currentSalary
      ? {
          gross: roundToTwoDecimals(
            calculateTotalEarnings(currentSalary.breakdowns),
          ),
          deductions: roundToTwoDecimals(
            calculateTotalRecoveries(currentSalary.ledger),
          ),
          paid: roundToTwoDecimals(
            calculateTotalPayments(currentSalary.ledger),
          ),
          balance: roundToTwoDecimals(
            calculateSalaryBalance(
              currentSalary.netAmount,
              currentSalary.ledger,
            ),
          ),
          earnings: currentSalary.breakdowns.filter((b) =>
            ["BASE_SALARY", "OVERTIME"].includes(b.type),
          ),
          payments: currentSalary.ledger.filter((l) => l.type === "PAYMENT"),
          extraDeductions: currentSalary.ledger.filter(
            (l) => l.type === "DEDUCTION" || l.type === "RECOVERY",
          ),
        }
      : {
          gross: 0,
          deductions: 0,
          paid: 0,
          balance: 0,
          earnings: [],
          payments: [],
          extraDeductions: [],
        };

    // ========================================
    // MONTHLY BREAKDOWN
    // ========================================
    const recentSalaries = allSalaries.slice(0, 24);

    const monthlyBreakdown = recentSalaries.map((salary) => {
      const payments = calculateTotalPayments(salary.ledger);
      const recoveries = calculateTotalRecoveries(salary.ledger);
      const balance = calculateSalaryBalance(salary.netAmount, salary.ledger);
      const earnings = calculateTotalEarnings(salary.breakdowns);

      return {
        month: salary.month,
        year: salary.year,
        period: `${getMonthName(salary.month)} ${salary.year}`,
        gross: roundToTwoDecimals(earnings),
        deductions: roundToTwoDecimals(recoveries),
        paid: roundToTwoDecimals(payments),
        balance: roundToTwoDecimals(balance),
        net: roundToTwoDecimals(salary.netAmount),
        status: salary.status,
      };
    });

    // ========================================
    // RECENT TRANSACTIONS (Only Salary Ledger)
    // ========================================
    const allLedgers = allSalaries.flatMap((s) =>
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

    // ========================================
    // RESPONSE
    // ========================================
    return NextResponse.json(
      {
        user: {
          firstName: user?.firstName,
          lastName: user?.lastName,
          joiningDate: user?.joiningDate,
        },
        lifetimeTotals: {
          // Total Earnings (Net Salary)
          totalSalary: roundToTwoDecimals(lifetimeTotalNetSalary),
          // Only Salary Payments (from salaryLedger)
          totalPaid: roundToTwoDecimals(lifetimeTotalSalaryPayments),
          // Recoveries from salaryLedger
          totalRecoveries: roundToTwoDecimals(lifetimeTotalRecoveries),
          // Net Position
          netPosition: roundToTwoDecimals(lifetimeNetPosition),
        },
        currentMonth: currentMonthData,
        monthlyBreakdown,
        recentTransactions,
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
