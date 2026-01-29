import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["ADMIN", "MANAGER", "STAFF"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // Calculate overall balance
    const balanceResult = await prisma.cashbookEntry.groupBy({
      by: ["direction"],
      where: {
        companyId: admin.company.id,
        isReversed: false,
      },
      _sum: {
        amount: true,
      },
    });

    const totalCredit =
      balanceResult.find((b: any) => b.direction === "CREDIT")?._sum.amount ||
      0;
    const totalDebit =
      balanceResult.find((b: any) => b.direction === "DEBIT")?._sum.amount || 0;
    const currentBalance = totalCredit - totalDebit;

    // Monthly balance
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const monthlyResult = await prisma.cashbookEntry.groupBy({
      by: ["direction"],
      where: {
        companyId: admin.company.id,
        isReversed: false,
        transactionDate: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1),
        },
      },
      _sum: {
        amount: true,
      },
    });

    const monthlyCredit =
      monthlyResult.find((b: any) => b.direction === "CREDIT")?._sum.amount ||
      0;
    const monthlyDebit =
      monthlyResult.find((b: any) => b.direction === "DEBIT")?._sum.amount || 0;
    const monthlyBalance = monthlyCredit - monthlyDebit;

    // Opening balance for current month
    const openingBalance = currentBalance - monthlyBalance;

    // Staff-specific balance (if staff user)
    let staffBalance = null;
    if (session.user.role === "STAFF") {
      const staffBalanceResult = await prisma.cashbookEntry.groupBy({
        by: ["direction"],
        where: {
          companyId: admin.company.id,
          userId: session.user.id,
          isReversed: false,
        },
        _sum: {
          amount: true,
        },
      });

      const staffCredit =
        staffBalanceResult.find((b: any) => b.direction === "CREDIT")?._sum
          .amount || 0;
      const staffDebit =
        staffBalanceResult.find((b: any) => b.direction === "DEBIT")?._sum
          .amount || 0;
      staffBalance = staffCredit - staffDebit;
    }

    return NextResponse.json({
      currentBalance,
      openingBalance,
      closingBalance: currentBalance,
      monthlyCredit,
      monthlyDebit,
      totalCredit,
      totalDebit,
      staffBalance,
    });
  } catch (error) {
    console.error("Cashbook balance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
