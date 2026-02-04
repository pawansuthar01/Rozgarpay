import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { CashbookFilters } from "@/types/cashbook";
import { getDate } from "@/lib/attendanceUtils";

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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    let limit = Math.max(
      1,
      Math.min(parseInt(searchParams.get("limit") || "10") || 10, 100),
    );
    const sortBy = searchParams.get("sortBy") || "transactionDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Get admin's company with minimal fields
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const companyId = admin.companyId;
    const skip = (page - 1) * limit;

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
      companyId,
      isReversed: false,
    };

    // Role-based filtering
    if (session.user.role === "STAFF") {
      where.userId = session.user.id;
    } else if (searchParams.get("userId")) {
      where.userId = searchParams.get("userId");
    }

    // Apply filters
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate)
        where.transactionDate.gte = getDate(new Date(filters.startDate));
      if (filters.endDate)
        where.transactionDate.lte = getDate(new Date(filters.endDate));
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

    // PARALLEL QUERIES: Run independent queries concurrently
    const [total, entries, balanceResult, monthlyResult] = await Promise.all([
      // Total count
      prisma.cashbookEntry.count({ where }),

      // Entries with selective field fetching
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
          isReversed: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),

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

      // Monthly stats
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
        _sum: {
          amount: true,
        },
      }),
    ]);

    // Calculate balances
    const totalCredit =
      balanceResult.find((b: any) => b.direction === "CREDIT")?._sum.amount ||
      0;
    const totalDebit =
      balanceResult.find((b: any) => b.direction === "DEBIT")?._sum.amount || 0;
    const currentBalance = totalCredit - totalDebit;

    const monthlyCredit =
      monthlyResult.find((b: any) => b.direction === "CREDIT")?._sum.amount ||
      0;
    const monthlyDebit =
      monthlyResult.find((b: any) => b.direction === "DEBIT")?._sum.amount || 0;

    const stats = {
      currentBalance,
      totalCredit,
      totalDebit,
      monthlyCredit,
      monthlyDebit,
      transactionCount: total,
    };

    // Build response with caching headers
    const response = NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
      balance: {
        currentBalance,
        openingBalance: currentBalance - (monthlyCredit - monthlyDebit),
        closingBalance: currentBalance,
      },
      filters,
    });

    // Cache for 30 seconds, stale-while-revalidate for 2 minutes
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=120",
    );

    return response;
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

    // Validate field lengths
    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 },
      );
    }

    if (notes && notes.length > 1000) {
      return NextResponse.json(
        { error: "Notes must be 1000 characters or less" },
        { status: 400 },
      );
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // If userId provided, verify they belong to the company
    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: admin.companyId,
        },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found in company" },
          { status: 400 },
        );
      }
    }

    // Create cashbook entry with transaction
    const entry = await prisma.cashbookEntry.create({
      data: {
        companyId: admin.companyId,
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
      select: {
        id: true,
        transactionType: true,
        direction: true,
        amount: true,
        description: true,
        transactionDate: true,
      },
    });

    // Create audit log (fire and forget - don't await)
    prisma.auditLog
      .create({
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
