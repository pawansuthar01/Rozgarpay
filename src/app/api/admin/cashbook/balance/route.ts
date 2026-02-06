import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

// No cache for instant updates

// No cache for instant updates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["ADMIN", "MANAGER", "STAFF"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔹 Company
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!me?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const companyId = me.companyId;
    const nowLocal = toZonedTime(new Date(), "Asia/Kolkata");
    const currentMonth = nowLocal.getMonth() + 1;
    const currentYear = nowLocal.getFullYear();

    // 🔥 PARALLEL QUERIES (reversal-safe)
    const [overallResult, monthlyResult, staffResult] = await Promise.all([
      // Overall balance (exclude ORIGINAL reversed entries only)
      prisma.cashbookEntry.groupBy({
        by: ["direction"],
        where: {
          companyId,
          isReversed: false, // original reversed entries ignored
        },
        _sum: { amount: true },
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
        _sum: { amount: true },
      }),

      // Staff balance (only own entries)
      session.user.role === "STAFF"
        ? prisma.cashbookEntry.groupBy({
            by: ["direction"],
            where: {
              companyId,
              userId: session.user.id,
              isReversed: false,
            },
            _sum: { amount: true },
          })
        : Promise.resolve(null),
    ]);

    // 🔹 Overall
    const totalCredit =
      overallResult.find((b) => b.direction === "CREDIT")?._sum.amount || 0;
    const totalDebit =
      overallResult.find((b) => b.direction === "DEBIT")?._sum.amount || 0;

    const currentBalance = totalCredit - totalDebit;

    // 🔹 Monthly
    const monthlyCredit =
      monthlyResult.find((b) => b.direction === "CREDIT")?._sum.amount || 0;
    const monthlyDebit =
      monthlyResult.find((b) => b.direction === "DEBIT")?._sum.amount || 0;

    const monthlyNet = monthlyCredit - monthlyDebit;
    const openingBalance = currentBalance - monthlyNet;

    // 🔹 Staff personal balance
    let staffBalance = null;
    if (staffResult) {
      const staffCredit =
        staffResult.find((b) => b.direction === "CREDIT")?._sum.amount || 0;
      const staffDebit =
        staffResult.find((b) => b.direction === "DEBIT")?._sum.amount || 0;
      staffBalance = staffCredit - staffDebit;
    }

    const response = NextResponse.json({
      openingBalance,
      closingBalance: currentBalance,
      currentBalance,
      totalCredit,
      totalDebit,
      monthlyCredit,
      monthlyDebit,
      monthlyBalance: monthlyNet,
      staffBalance,
    });

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );
    return response;
  } catch (error) {
    console.error("Cashbook balance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
