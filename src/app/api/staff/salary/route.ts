import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : null;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : null;

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    if (month !== null) {
      where.month = month;
    }

    if (year !== null) {
      where.year = year;
    }

    // Get salaries
    const salaries = await prisma.salary.findMany({
      where,
      include: {
        breakdowns: true,
        ledger: {
          orderBy: { createdAt: "desc" },
        },
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

    // Get current month/year if no filter
    const currentDate = new Date();
    const currentMonth = month ?? currentDate.getMonth() + 1;
    const currentYear = year ?? currentDate.getFullYear();

    // Get current salary if exists
    const currentSalary = salaries.find(
      (s) => s.month === currentMonth && s.year === currentYear,
    );

    // Calculate summary stats
    const stats = {
      totalSalaries: salaries.length,
      pending: salaries.filter((s) => s.status === "PENDING").length,
      approved: salaries.filter((s) => s.status === "APPROVED").length,
      paid: salaries.filter((s) => s.status === "PAID").length,
      rejected: salaries.filter((s) => s.status === "REJECTED").length,
      totalEarned: salaries
        .filter((s) => s.status === "PAID")
        .reduce((sum, s) => sum + s.netAmount, 0),
    };

    return NextResponse.json({
      salaries,
      currentSalary,
      stats,
      currentMonth,
      currentYear,
    });
  } catch (error) {
    console.error("Staff salary fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
