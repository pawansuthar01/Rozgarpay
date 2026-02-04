import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

// Cache for 2 minutes
const CACHE_CONTROL = "public, s-maxage=120, stale-while-revalidate=600";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["ADMIN", "MANAGER", "STAFF"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's company with minimal fields
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const companyId = admin.companyId;
    const nowLocal = toZonedTime(new Date(), "Asia/Kolkata");
    const currentMonth = nowLocal.getMonth() + 1;
    const currentYear = nowLocal.getFullYear();

    // PARALLEL QUERIES: Run all balance queries concurrently
    const [overallResult, monthlyResult, staffResult] = await Promise.all([
      // Overall balance
      prisma.cashbookEntry.groupBy({
        by: ["direction"],
        where: {
          companyId,
          isReversed: false,
        },
        _sum: {
          amount: true,
        },
      }),

      // Monthly balance
      prisma.cashbookEntry.groupBy({
        by: ["direction"],
        where: {
          companyId,
          isReversed: false,
          transactionDate: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lt: new Date(currentYear, currentMonth, 1),
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Staff-specific balance (if staff user)
      session.user.role === "STAFF"
        ? prisma.cashbookEntry.groupBy({
            by: ["direction"],
            where: {
              companyId,
              userId: session.user.id,
              isReversed: false,
            },
            _sum: {
              amount: true,
            },
          })
        : Promise.resolve(null),
    ]);

    // Calculate balances
    const totalCredit =
      overallResult.find((b) => b.direction === "CREDIT")?._sum.amount || 0;
    const totalDebit =
      overallResult.find((b) => b.direction === "DEBIT")?._sum.amount || 0;
    const currentBalance = totalCredit - totalDebit;

    const monthlyCredit =
      monthlyResult.find((b) => b.direction === "CREDIT")?._sum.amount || 0;
    const monthlyDebit =
      monthlyResult.find((b) => b.direction === "DEBIT")?._sum.amount || 0;
    const monthlyNet = monthlyCredit - monthlyDebit;

    const openingBalance = currentBalance - monthlyNet;

    let personalBalance = null;
    if (staffResult) {
      const staffCredit =
        staffResult.find((b) => b.direction === "CREDIT")?._sum.amount || 0;
      const staffDebit =
        staffResult.find((b) => b.direction === "DEBIT")?._sum.amount || 0;
      personalBalance = staffCredit - staffDebit;
    }

    const response = NextResponse.json({
      currentBalance,
      openingBalance,
      closingBalance: currentBalance,
      monthlyCredit,
      monthlyDebit,
      monthlyBalance: monthlyNet,
      totalCredit,
      totalDebit,
      staffBalance: personalBalance,
    });

    response.headers.set("Cache-Control", CACHE_CONTROL);
    return response;
  } catch (error) {
    console.error("Cashbook balance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
