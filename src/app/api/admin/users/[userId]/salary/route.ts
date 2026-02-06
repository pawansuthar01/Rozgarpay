import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

// Cache for 2 minutes
const CACHE_CONTROL = "public, s-maxage=120, stale-while-revalidate=600";

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
    const monthParam = searchParams.get("month");

    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    // Parse month parameter
    let month: number, year: number;
    if (monthParam && monthParam.includes("-")) {
      [year, month] = monthParam.split("-").map(Number);
    } else {
      const currentDate = getDate(new Date());
      month = currentDate.getMonth() + 1;
      year = currentDate.getFullYear();
    }

    // Get salary record for the specified month
    const salary = await prisma.salary.findFirst({
      where: { userId, companyId, month, year },
      select: {
        id: true,
        grossAmount: true,
        netAmount: true,
        pdfUrl: true,
        breakdowns: true,
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
    });

    if (!salary) {
      const response = NextResponse.json({
        month,
        year,
        grossAmount: 0,
        netAmount: 0,
        totalPaid: 0,
        totalRecovered: 0,
        balanceAmount: 0,
        payments: [],
        deductions: [],
        recoveries: [],
      });
      response.headers.set("Cache-Control", CACHE_CONTROL);
      return response;
    }

    // Get ledger entries for calculations
    const ledgerEntries = salary.ledger || [];

    // Calculate totals from ledger
    const totalPaid = ledgerEntries
      .filter((entry) => entry.type === "PAYMENT")
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const totalRecovered = ledgerEntries
      .filter((entry) => entry.type === "RECOVERY")
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    const totalDeductions = ledgerEntries
      .filter((entry) => entry.type === "DEDUCTION")
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    const balanceAmount = salaryService.calculateSalaryBalance(
      salary,
      ledgerEntries,
    );

    // Group ledger entries
    const payments = ledgerEntries
      .filter((entry) => entry.type === "PAYMENT")
      .map((entry) => ({
        id: entry.id,
        amount: entry.amount,
        type: entry.type,
        description: entry.reason,
        date: entry.createdAt.toISOString().split("T")[0],
      }));

    const deductions = ledgerEntries
      .filter((entry) => entry.type === "DEDUCTION")
      .map((entry) => ({
        id: entry.id,
        amount: Math.abs(entry.amount),
        type: entry.type,
        description: entry.reason,
        date: entry.createdAt.toISOString().split("T")[0],
      }));

    const recoveries = ledgerEntries
      .filter((entry) => entry.type === "RECOVERY")
      .map((entry) => ({
        id: entry.id,
        amount: Math.abs(entry.amount),
        type: entry.type,
        description: entry.reason,
        date: entry.createdAt.toISOString().split("T")[0],
      }));

    const response = NextResponse.json({
      month,
      year,
      grossAmount: salary.grossAmount,
      netAmount: salary.netAmount,
      totalPaid,
      totalDeductions,
      totalRecovered,
      balanceAmount,
      payments,
      deductions,
      recoveries,
      pdfUrl: salary.pdfUrl,
      breakdowns: salary.breakdowns,
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
