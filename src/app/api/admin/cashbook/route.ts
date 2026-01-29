import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import { CashbookFilters } from "@/types/cashbook";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "transactionDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // Build filters
    const filters: CashbookFilters = {};
    if (searchParams.get("startDate"))
      filters.startDate = searchParams.get("startDate")!;
    if (searchParams.get("endDate"))
      filters.endDate = searchParams.get("endDate")!;
    if (searchParams.get("transactionType"))
      filters.transactionType = searchParams.get("transactionType") as any;
    if (searchParams.get("direction"))
      filters.direction = searchParams.get("direction") as any;
    if (searchParams.get("paymentMode"))
      filters.paymentMode = searchParams.get("paymentMode") as any;
    if (searchParams.get("search"))
      filters.search = searchParams.get("search")!;

    // Build where clause
    const where: any = {
      companyId: admin.company.id,
      isReversed: false, // Don't show reversed entries
    };

    // Role-based filtering
    if (session.user.role === "STAFF") {
      // Staff can only see their own transactions
      where.userId = session.user.id;
    } else if (searchParams.get("userId")) {
      where.userId = searchParams.get("userId");
    }

    // Apply filters
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate)
        where.transactionDate.gte = new Date(filters.startDate);
      if (filters.endDate)
        where.transactionDate.lte = new Date(filters.endDate);
    }

    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }

    if (filters.direction) {
      where.direction = filters.direction;
    }

    if (filters.paymentMode) {
      where.paymentMode = filters.paymentMode;
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
        { reference: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await prisma.cashbookEntry.count({ where });

    // Get entries
    const entries = await prisma.cashbookEntry.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        creator: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate balance
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

    // Monthly stats
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

    // Staff balance (if viewing own ledger)
    let staffBalance = 0;
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

    const stats = {
      currentBalance,
      totalCredit,
      totalDebit,
      monthlyCredit,
      monthlyDebit,
      transactionCount: total,
    };

    const balance = {
      currentBalance,
      openingBalance: currentBalance - (monthlyCredit - monthlyDebit),
      closingBalance: currentBalance,
      staffBalance: session.user.role === "STAFF" ? staffBalance : undefined,
    };

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
      balance,
      filters,
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

    // Validation
    if (!transactionType || !direction || !amount || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // If userId provided, verify they belong to the company
    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: admin.company.id,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found in company" },
          { status: 400 },
        );
      }
    }

    // Create cashbook entry
    const entry = await prisma.cashbookEntry.create({
      data: {
        companyId: admin.company.id,
        userId,
        transactionType,
        direction,
        amount,
        paymentMode,
        reference,
        description,
        notes,
        transactionDate: transactionDate
          ? new Date(transactionDate)
          : new Date(),
        createdBy: session.user.id,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        creator: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED",
        entity: "CashbookEntry",
        entityId: entry.id,
        meta: {
          transactionType,
          direction,
          amount,
          description,
        },
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Cashbook create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
