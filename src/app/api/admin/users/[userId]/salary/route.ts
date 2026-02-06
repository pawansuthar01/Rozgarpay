import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// Cache for 20 s
const CACHE_CONTROL = "public, s-maxage=20, stale-while-revalidate=600";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const companyId = session.user.companyId;
    const { searchParams } = new URL(request.url);

    // Get date range parameters
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const monthParam = searchParams.get("month");

    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    // Parse date range or month parameter
    let startDateStr: string;
    let endDateStr: string;
    let displayMonth: number;
    let displayYear: number;
    let filterStartMonth: number;
    let filterStartYear: number;
    let filterEndMonth: number;
    let filterEndYear: number;

    if (startDateParam && endDateParam) {
      // Use date range - format as ISO date strings at midnight UTC
      const [startYear, startMonthNum, startDay] = startDateParam
        .split("-")
        .map(Number);
      const [endYear, endMonthNum, endDay] = endDateParam
        .split("-")
        .map(Number);

      // Create ISO date strings at start and end of day
      startDateStr = `${startYear}-${String(startMonthNum).padStart(2, "0")}-${String(startDay).padStart(2, "0")}T00:00:00.000Z`;
      endDateStr = `${endYear}-${String(endMonthNum).padStart(2, "0")}-${String(endDay).padStart(2, "0")}T23:59:59.999Z`;

      displayMonth = startMonthNum;
      displayYear = startYear;

      // Track months for salary filtering
      filterStartMonth = startMonthNum;
      filterStartYear = startYear;
      filterEndMonth = endMonthNum;
      filterEndYear = endYear;
    } else if (monthParam && monthParam.includes("-")) {
      // Use month parameter (format: YYYY-MM)
      [displayYear, displayMonth] = monthParam.split("-").map(Number);
      const lastDay = new Date(displayYear, displayMonth - 1, 0).getDate();
      startDateStr = `${displayYear}-${String(displayMonth).padStart(2, "0")}-01T00:00:00.000Z`;
      endDateStr = `${displayYear}-${String(displayMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;

      filterStartMonth = displayMonth;
      filterStartYear = displayYear;
      filterEndMonth = displayMonth;
      filterEndYear = displayYear;
    } else {
      // Default to current month
      const now = new Date();
      displayMonth = now.getMonth() + 1;
      displayYear = now.getFullYear();
      const lastDay = new Date(displayYear, displayMonth - 1, 0).getDate();
      startDateStr = `${displayYear}-${String(displayMonth).padStart(2, "0")}-01T00:00:00.000Z`;
      endDateStr = `${displayYear}-${String(displayMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;

      filterStartMonth = displayMonth;
      filterStartYear = displayYear;
      filterEndMonth = displayMonth;
      filterEndYear = displayYear;
    }

    // Helper function to check if a month/year falls within the filter range
    const isMonthInRange = (month: number, year: number): boolean => {
      const start = filterStartYear * 12 + filterStartMonth;
      const end = filterEndYear * 12 + filterEndMonth;
      const current = year * 12 + month;
      return current >= start && current <= end;
    };

    // Fetch all salary records for this user (regardless of date)
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
        pdfUrl: true,
        breakdowns: true,
        createdAt: true,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    // Get all ledger entries that fall within the date range (filter by ledger's createdAt)
    const salaryIds = allSalaries.map((s) => s.id);

    let ledgerEntries: any[] = [];
    if (salaryIds.length > 0) {
      // Query with date range for ledger entries using ISO strings
      ledgerEntries = await prisma.salaryLedger.findMany({
        where: {
          salaryId: { in: salaryIds },
          createdAt: {
            gte: startDateStr,
            lte: endDateStr,
          },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          reason: true,
          createdAt: true,
          salaryId: true,
          salary: {
            select: {
              month: true,
              year: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Calculate totals from filtered ledger entries
    const totalPaid = ledgerEntries
      .filter((entry) => entry.type === "PAYMENT")
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const totalRecovered = ledgerEntries
      .filter((entry) => entry.type === "RECOVERY")
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    const totalDeductions = ledgerEntries
      .filter((entry) => entry.type === "DEDUCTION")
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    // Get unique salary IDs from filtered ledger entries
    const relevantSalaryIdsFromLedger = [
      ...new Set(ledgerEntries.map((e) => e.salaryId)),
    ];

    // Get salaries whose month is in the selected date range (for Gross/Net calculation)
    const relevantSalaries = allSalaries.filter((s) =>
      isMonthInRange(s.month, s.year),
    );

    // Aggregate gross/net from relevant salaries (salaries whose month is in the selected range)
    const totalGross = relevantSalaries.reduce(
      (sum, s) => sum + (s.grossAmount || 0),
      0,
    );
    const totalNet = relevantSalaries.reduce(
      (sum, s) => sum + (s.netAmount || 0),
      0,
    );

    // Calculate balance: Balance = Net Salary - Payments for that salary
    // We need to calculate payments per salary month, not total payments
    const paymentsBySalaryMonth: Record<string, number> = {};
    const recoveriesBySalaryMonth: Record<string, number> = {};
    const deductionsBySalaryMonth: Record<string, number> = {};

    ledgerEntries.forEach((entry) => {
      const key = `${entry.salary.month}/${entry.salary.year}`;
      if (entry.type === "PAYMENT") {
        paymentsBySalaryMonth[key] =
          (paymentsBySalaryMonth[key] || 0) + Math.abs(entry.amount);
      } else if (entry.type === "RECOVERY") {
        recoveriesBySalaryMonth[key] =
          (recoveriesBySalaryMonth[key] || 0) + Math.abs(entry.amount);
      } else if (entry.type === "DEDUCTION") {
        deductionsBySalaryMonth[key] =
          (deductionsBySalaryMonth[key] || 0) + Math.abs(entry.amount);
      }
    });

    // Calculate balance for the selected month(s)
    // For each selected month, balance = netAmount - payments - recoveries - deductions
    let totalBalance = 0;
    relevantSalaries.forEach((salary) => {
      const key = `${salary.month}/${salary.year}`;
      const paid = paymentsBySalaryMonth[key] || 0;
      const recovered = recoveriesBySalaryMonth[key] || 0;
      const deductions = deductionsBySalaryMonth[key] || 0;
      totalBalance += (salary.netAmount || 0) - paid - recovered - deductions;
    });

    // Group ledger entries by type
    const payments = ledgerEntries
      .filter((entry) => entry.type === "PAYMENT")
      .map((entry) => ({
        id: entry.id,
        amount: entry.amount,
        type: entry.type,
        description: entry.reason,
        date: entry.createdAt.toISOString().split("T")[0],
        month: entry.salary.month,
        year: entry.salary.year,
      }));

    const deductions = ledgerEntries
      .filter((entry) => entry.type === "DEDUCTION")
      .map((entry) => ({
        id: entry.id,
        amount: Math.abs(entry.amount),
        type: entry.type,
        description: entry.reason,
        date: entry.createdAt.toISOString().split("T")[0],
        month: entry.salary.month,
        year: entry.salary.year,
      }));

    const recoveries = ledgerEntries
      .filter((entry) => entry.type === "RECOVERY")
      .map((entry) => ({
        id: entry.id,
        amount: Math.abs(entry.amount),
        type: entry.type,
        description: entry.reason,
        date: entry.createdAt.toISOString().split("T")[0],
        month: entry.salary.month,
        year: entry.salary.year,
      }));

    // Build breakdown ONLY from salaries whose month is in the selected date range
    const allBreakdowns: Array<{
      type: string;
      description: string;
      amount: number;
      category: string;
    }> = [];

    relevantSalaries.forEach((salary) => {
      if (salary.breakdowns && Array.isArray(salary.breakdowns)) {
        salary.breakdowns.forEach((item: any) => {
          allBreakdowns.push({
            ...item,
            category: `${salary.month}/${salary.year}`,
          });
        });
      }
    });

    // Add totals for the selected month(s)
    const relevantPayments = relevantSalaries.reduce(
      (sum, s) => sum + (paymentsBySalaryMonth[`${s.month}/${s.year}`] || 0),
      0,
    );
    const relevantRecoveries = relevantSalaries.reduce(
      (sum, s) => sum + (recoveriesBySalaryMonth[`${s.month}/${s.year}`] || 0),
      0,
    );
    const relevantDeductions = relevantSalaries.reduce(
      (sum, s) => sum + (deductionsBySalaryMonth[`${s.month}/${s.year}`] || 0),
      0,
    );

    if (relevantPayments > 0) {
      allBreakdowns.push({
        type: "PAYMENT",
        description: "Total Payments",
        amount: relevantPayments,
        category: "Payments",
      });
    }

    if (relevantDeductions > 0) {
      allBreakdowns.push({
        type: "DEDUCTION",
        description: "Total Deductions",
        amount: -relevantDeductions,
        category: "Deductions",
      });
    }

    if (relevantRecoveries > 0) {
      allBreakdowns.push({
        type: "RECOVERY",
        description: "Total Recoveries",
        amount: -relevantRecoveries,
        category: "Recoveries",
      });
    }

    const response = NextResponse.json({
      month: displayMonth,
      year: displayYear,
      dateRange: {
        start: startDateParam || "",
        end: endDateParam || "",
      },
      grossAmount: totalGross,
      netAmount: totalNet,
      totalPaid: relevantPayments,
      totalDeductions: relevantDeductions,
      totalRecovered: relevantRecoveries,
      balanceAmount: totalBalance,
      payments,
      deductions,
      recoveries,
      allTransactions: [
        ...payments.map((p) => ({ ...p, category: "PAYMENT" })),
        ...deductions.map((d) => ({ ...d, category: "DEDUCTION" })),
        ...recoveries.map((r) => ({ ...r, category: "RECOVERY" })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      breakdowns: allBreakdowns,
      salaryCount: relevantSalaries.length,
      months: relevantSalaries.map((s) => ({ month: s.month, year: s.year })),
    });

    response.headers.set("Cache-Control", CACHE_CONTROL);
    return response;
  } catch (error) {
    console.error("Admin user salary GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
