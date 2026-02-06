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
    const format = searchParams.get("format") || "json"; // json | pdf

    // 🔹 Company ownership
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        company: true,
      },
    });

    if (!admin?.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // 🔹 Base filters (reversal-safe)
    const filters: any = {
      companyId: admin.company.id,
      isReversed: false, // ❗ ignore original reversed entries only
    };

    // 🔹 Date range
    if (searchParams.get("startDate") || searchParams.get("endDate")) {
      filters.transactionDate = {};
      if (searchParams.get("startDate")) {
        filters.transactionDate.gte = new Date(searchParams.get("startDate")!);
      }
      if (searchParams.get("endDate")) {
        filters.transactionDate.lte = new Date(searchParams.get("endDate")!);
      }
    }

    // 🔹 Filters
    if (searchParams.get("transactionType")) {
      filters.transactionType = searchParams.get("transactionType");
    }

    if (searchParams.get("direction")) {
      filters.direction = searchParams.get("direction");
    }

    // 🔹 User filter (ADMIN only)
    if (session.user.role === "ADMIN" && searchParams.get("userId")) {
      filters.userId = searchParams.get("userId");
    }

    // 🔹 Fetch transactions
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

    // 🔹 Summary (sign-safe)
    const summary = transactions.reduce(
      (acc, t) => {
        if (t.direction === "CREDIT") {
          acc.totalCredit += t.amount;
        } else {
          acc.totalDebit += t.amount;
        }
        acc.totalTransactions += 1;
        return acc;
      },
      {
        totalTransactions: 0,
        totalCredit: 0,
        totalDebit: 0,
        netBalance: 0,
      },
    );

    summary.netBalance = summary.totalCredit - summary.totalDebit;

    // 🔹 Group by transaction type
    const typeSummary = transactions.reduce(
      (
        acc: Record<string, { credit: number; debit: number; count: number }>,
        t,
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

    // 🔹 PDF export
    if (format === "pdf") {
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
          userId: searchParams.get("userId"),
        },
        generatedBy: session.user,
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=cashbook-report-${
            getDate(new Date()).toISOString().split("T")[0]
          }.pdf`,
        },
      });
    }

    // 🔹 JSON response
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
        name: `${session.user.firstName || ""} ${
          session.user.lastName || ""
        }`.trim(),
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
