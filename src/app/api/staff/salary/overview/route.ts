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

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { joiningDate: true, firstName: true, lastName: true },
    });

    // Fetch all salaries for lifetime calculations
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
    // LIFETIME BALANCE (Net Position)
    // ========================================
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
    // RECENT TRANSACTIONS (Only from all salaries)
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
      .slice(0, 10)
      .map((ledger) => ({
        id: ledger.id,
        type: ledger.type,
        description: ledger.reason,
        amount: ledger.amount,
        date: new Date(ledger.createdAt).toISOString().split("T")[0],
        salaryMonth: ledger.salaryMonth,
      }));

    // ========================================
    // RESPONSE - No caching for fresh data
    // ========================================
    return NextResponse.json(
      {
        user: {
          firstName: user?.firstName,
          lastName: user?.lastName,
          joiningDate: user?.joiningDate,
        },
        lifetimeBalance: roundToTwoDecimals(lifetimeNetPosition),
        recentTransactions,
      },
      {
        headers: {
          // Disable all caching for fresh data
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
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
