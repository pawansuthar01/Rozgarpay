import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : null;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : null;

    // Build where clause
    const where: any = {
      userId,
    };

    if (month !== null) {
      where.month = month;
    }

    if (year !== null) {
      where.year = year;
    }

    // Always include ledger data for salary history view
    const includeLedger = true;

    // Get salaries with minimal data for list view
    const salaries = await prisma.salary.findMany({
      where,
      select: {
        id: true,
        month: true,
        year: true,
        netAmount: true,
        grossAmount: true,
        status: true,
        paidAt: true,
        createdAt: true,
        breakdowns: {
          select: {
            type: true,
            amount: true,
            description: true,
          },
        },
        // Only include ledger when filtering by specific month/year
        ledger: includeLedger
          ? {
              select: {
                id: true,
                type: true,
                amount: true,
                reason: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            }
          : false,
        approvedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        rejectedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Get current month/year in Asia/Kolkata if no filter
    const nowLocal = toZonedTime(new Date(), "Asia/Kolkata");
    const currentMonth = month ?? nowLocal.getMonth() + 1;
    const currentYear = year ?? nowLocal.getFullYear();

    // Get current salary if exists
    const currentSalary = salaries.find(
      (s) => s.month === currentMonth && s.year === currentYear,
    );

    // Calculate summary stats efficiently
    let stats = {
      totalSalaries: salaries.length,
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      totalEarned: 0,
    };

    for (const s of salaries) {
      switch (s.status) {
        case "PENDING":
          stats.pending++;
          break;
        case "APPROVED":
          stats.approved++;
          break;
        case "PAID":
          stats.paid++;
          stats.totalEarned += s.netAmount;
          break;
        case "REJECTED":
          stats.rejected++;
          break;
      }
    }

    // No caching for fresh data
    return NextResponse.json(
      {
        salaries,
        currentSalary,
        stats,
        currentMonth,
        currentYear,
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Staff salary fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
