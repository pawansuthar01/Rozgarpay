import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  calculateSalaryBalance,
  calculateTotalPayments,
  calculateTotalRecoveries,
  getMonthName,
  roundToTwoDecimals,
} from "@/lib/salaryService";

export async function GET(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      10,
      Math.max(1, Number(searchParams.get("limit") || 5)),
    );
    const skip = (page - 1) * limit;

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const companyId = admin.companyId;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // PARALLEL (SAFE)
    const [
      user,
      salaryCount,
      salaryRecords,
      allSalaries,
      thisMonthSalary,
      allLedgers,
      thisMonthLedgers,
    ] = await Promise.all([
      prisma.user.findFirst({
        where: { id: userId, companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          onboardingCompleted: true,
        },
      }),

      prisma.salary.count({ where: { userId, companyId } }),

      prisma.salary.findMany({
        where: { userId, companyId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          month: true,
          year: true,
          grossAmount: true,
          netAmount: true,
          status: true,
          createdAt: true,
        },
      }),

      prisma.salary.findMany({
        where: { userId, companyId },
        select: { grossAmount: true, netAmount: true },
      }),

      prisma.salary.findFirst({
        where: { userId, companyId, month: currentMonth, year: currentYear },
        include: {
          ledger: true,
        },
      }),

      // All salary ledger entries for this user
      prisma.salaryLedger.findMany({
        where: { userId, companyId },
        select: { type: true, amount: true },
      }),

      // Current month salary ledger entries
      prisma.salaryLedger.findMany({
        where: {
          userId,
          companyId,
          salary: {
            month: currentMonth,
            year: currentYear,
          },
        },
        select: { type: true, amount: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ========================================
    // LIFETIME SUMMARY (Only Salary Ledger)
    // ========================================
    // Formula: Net Position = Total Net Salary - Total Payments - Total Recoveries
    // Only count salaryLedger transactions (PAYMENT, RECOVERY, DEDUCTION)
    const lifetimeTotalNetSalary = allSalaries.reduce(
      (sum, s) => sum + (s.netAmount || 0),
      0,
    );
    const lifetimeTotalPaid = calculateTotalPayments(allLedgers);
    const lifetimeTotalRecovered = calculateTotalRecoveries(allLedgers);
    const lifetimeNetPosition =
      lifetimeTotalNetSalary - lifetimeTotalPaid - lifetimeTotalRecovered;

    // ========================================
    // THIS MONTH (Only Salary Ledger)
    // ========================================
    const thisMonthGross = thisMonthSalary?.grossAmount || 0;
    const thisMonthNet = thisMonthSalary?.netAmount || 0;
    const thisMonthPaid = calculateTotalPayments(thisMonthLedgers);
    const thisMonthRecovered = calculateTotalRecoveries(thisMonthLedgers);
    const thisMonthBalance = calculateSalaryBalance(
      thisMonthNet,
      thisMonthLedgers,
    );

    // ========================================
    // SALARY RECORDS WITH PROPER FORMATTING
    // ========================================
    const formattedSalaryRecords = salaryRecords.map((record) => ({
      ...record,
      period: `${getMonthName(record.month)} ${record.year}`,
    }));

    const response = NextResponse.json({
      user,
      totals: {
        // Total Net Salary Earned
        totalGiven: roundToTwoDecimals(lifetimeTotalNetSalary),
        // Only Salary Payments (from salaryLedger)
        totalPaid: roundToTwoDecimals(lifetimeTotalPaid),
        // Recoveries from salaryLedger
        totalRecovered: roundToTwoDecimals(lifetimeTotalRecovered),
        // Net Position: + = Company owes staff, - = Staff owes company
        netPosition: roundToTwoDecimals(lifetimeNetPosition),
      },
      thisMonthData: {
        grossAmount: roundToTwoDecimals(thisMonthGross),
        netAmount: roundToTwoDecimals(thisMonthNet),
        totalPaid: roundToTwoDecimals(thisMonthPaid),
        totalRecovered: roundToTwoDecimals(thisMonthRecovered),
        balanceAmount: roundToTwoDecimals(thisMonthBalance),
        period: `${getMonthName(currentMonth)} ${currentYear}`,
      },
      salaryRecords: {
        data: formattedSalaryRecords,
        pagination: {
          page,
          limit,
          total: salaryCount,
          totalPages: Math.ceil(salaryCount / limit),
        },
      },
    });

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("User salary summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const { status } = await request.json();

    if (!["ACTIVE", "SUSPENDED", "DEACTIVATED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

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

    const updatedUser = await prisma.user.updateMany({
      where: { id: userId, companyId: admin.company.id },
      data: { status: status as any },
    });
    if (updatedUser.count === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User status updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
