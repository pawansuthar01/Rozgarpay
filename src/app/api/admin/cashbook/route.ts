import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["ADMIN", "MANAGER", "STAFF"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 10)),
    );
    const sortBy = searchParams.get("sortBy") || "transactionDate";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!me?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const companyId = me.companyId;
    const skip = (page - 1) * limit;

    // 🔹 Base where (reversal-safe)
    const where: any = {
      companyId,
      isReversed: false, // original reversed entries hidden
    };

    // 🔹 Role-based filter
    if (session.user.role === "STAFF") {
      where.userId = session.user.id;
    } else if (searchParams.get("userId")) {
      where.userId = searchParams.get("userId");
    }

    // 🔹 Date filter
    if (searchParams.get("startDate") || searchParams.get("endDate")) {
      where.transactionDate = {};
      if (searchParams.get("startDate")) {
        where.transactionDate.gte = new Date(searchParams.get("startDate")!);
      }
      if (searchParams.get("endDate")) {
        where.transactionDate.lte = new Date(searchParams.get("endDate")!);
      }
    }

    // 🔹 Other filters
    if (searchParams.get("transactionType")) {
      where.transactionType = searchParams.get("transactionType");
    }
    if (searchParams.get("direction")) {
      where.direction = searchParams.get("direction");
    }
    if (searchParams.get("paymentMode")) {
      where.paymentMode = searchParams.get("paymentMode");
    }

    if (searchParams.get("search")) {
      const q = searchParams.get("search")!;
      where.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
      ];
    }

    // 🔥 Parallel queries
    const [total, entries, balanceResult, monthlyResult] = await Promise.all([
      prisma.cashbookEntry.count({ where }),

      prisma.cashbookEntry.findMany({
        where,
        select: {
          id: true,
          transactionType: true,
          direction: true,
          amount: true,
          paymentMode: true,
          reference: true,
          description: true,
          transactionDate: true,
          user: {
            select: { firstName: true, lastName: true, id: true, phone: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),

      prisma.cashbookEntry.groupBy({
        by: ["direction"],
        where: { companyId, isReversed: false },
        _sum: { amount: true },
      }),

      prisma.cashbookEntry.groupBy({
        by: ["direction"],
        where: {
          companyId,
          isReversed: false,
          transactionDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              1,
            ),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    // 🔹 Balances
    const totalCredit =
      balanceResult.find((b) => b.direction === "CREDIT")?._sum.amount || 0;
    const totalDebit =
      balanceResult.find((b) => b.direction === "DEBIT")?._sum.amount || 0;

    const monthlyCredit =
      monthlyResult.find((b) => b.direction === "CREDIT")?._sum.amount || 0;
    const monthlyDebit =
      monthlyResult.find((b) => b.direction === "DEBIT")?._sum.amount || 0;

    const currentBalance = totalCredit - totalDebit;

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        currentBalance,
        totalCredit,
        totalDebit,
        monthlyCredit,
        monthlyDebit,
      },
      balance: {
        openingBalance: currentBalance - (monthlyCredit - monthlyDebit),
        closingBalance: currentBalance,
      },
    });
  } catch (error) {
    console.error("Cashbook fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      transactionType,
      direction,
      amount,
      paymentMode,
      reference,
      description,
      notes,
      transactionDate,
      userId,
    } = body;

    if (!transactionType || !direction || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const parsedAmount = Math.abs(Number(amount));
    if (!parsedAmount || Number.isNaN(parsedAmount)) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!me?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // 🔹 Validate user (if provided)
    if (userId) {
      const user = await prisma.user.findFirst({
        where: { id: userId, companyId: me.companyId },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found in company" },
          { status: 400 },
        );
      }
    }

    const entry = await prisma.cashbookEntry.create({
      data: {
        companyId: me.companyId,
        userId,
        transactionType,
        direction,
        amount: parsedAmount,
        paymentMode,
        reference,
        description,
        notes,
        transactionDate: transactionDate
          ? new Date(transactionDate)
          : new Date(),
        createdBy: session.user.id,
      },
    });

    // 🔹 Audit (async)
    prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "CREATED",
          entity: "CashbookEntry",
          entityId: entry.id,
          meta: { transactionType, direction, amount: parsedAmount },
        },
      })
      .catch(console.error);

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Cashbook create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
