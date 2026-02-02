import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
import { generateCashbookPDFBuffer } from "@/lib/cashbookPdfGenerator";
import { getDate } from "@/lib/attendanceUtils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json"; // json, pdf

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // Build filters
    const filters: any = {
      companyId: admin.company.id,
      isReversed: false,
    };

    // Date range
    if (searchParams.get("startDate")) {
      filters.transactionDate = {
        ...filters.transactionDate,
        gte: new Date(searchParams.get("startDate")!),
      };
    }
    if (searchParams.get("endDate")) {
      filters.transactionDate = {
        ...filters.transactionDate,
        lte: new Date(searchParams.get("endDate")!),
      };
    }

    // Transaction type
    if (searchParams.get("transactionType")) {
      filters.transactionType = searchParams.get("transactionType");
    }

    // Direction
    if (searchParams.get("direction")) {
      filters.direction = searchParams.get("direction");
    }

    // User filter (only for ADMIN)
    if (session.user.role === "ADMIN" && searchParams.get("userId")) {
      filters.userId = searchParams.get("userId");
    }

    // Get transactions
    const transactions = await prisma.cashbookEntry.findMany({
      where: filters,
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
        transactionDate: "asc",
      },
    });

    // Calculate summary
    const summary = {
      totalTransactions: transactions.length,
      totalCredit: transactions
        .filter((t: any) => t.direction === "CREDIT")
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      totalDebit: transactions
        .filter((t: any) => t.direction === "DEBIT")
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      netBalance: 0,
    };
    summary.netBalance = summary.totalCredit - summary.totalDebit;

    // Group by transaction type
    const typeSummary = transactions.reduce(
      (
        acc: Record<string, { credit: number; debit: number; count: number }>,
        t: any,
      ) => {
        if (!acc[t.transactionType]) {
          acc[t.transactionType] = { credit: 0, debit: 0, count: 0 };
        }
        if (t.direction === "CREDIT") {
          acc[t.transactionType].credit += t.amount;
        } else {
          acc[t.transactionType].debit += t.amount;
        }
        acc[t.transactionType].count += 1;
        return acc;
      },
      {},
    );

    if (format === "pdf") {
      // Generate PDF report
      const pdfBuffer = await generateCashbookPDF({
        company: admin.company,
        transactions,
        summary,
        typeSummary,
        filters: {
          startDate: searchParams.get("startDate"),
          endDate: searchParams.get("endDate"),
          transactionType: searchParams.get("transactionType"),
          direction: searchParams.get("direction"),
        },
        generatedBy: session.user,
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=cashbook-report-${getDate(new Date()).toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    // Return JSON data
    return NextResponse.json({
      company: admin.company,
      transactions,
      summary,
      typeSummary,
      filters: {
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
        transactionType: searchParams.get("transactionType"),
        direction: searchParams.get("direction"),
        userId: searchParams.get("userId"),
      },
      generatedAt: getDate(new Date()).toISOString(),
      generatedBy: {
        name: `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim(),
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error("Cashbook report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function generateCashbookPDF(data: any): Promise<Buffer> {
  return generateCashbookPDFBuffer(data);
}
