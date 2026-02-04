import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

// Enable caching with stale-while-revalidate
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    /* ───────────────────────
       1️⃣ AUTH CHECK
    ─────────────────────── */
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ───────────────────────
       2️⃣ GET COMPANY (Optimized: select only needed fields)
    ─────────────────────── */
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyId: true,
      },
    });

    if (!admin?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const companyId = admin.companyId;

    /* ───────────────────────
       3️⃣ DATE HELPERS
    ─────────────────────── */
    const now = getDate(new Date());
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    /* ───────────────────────
       4️⃣ FAST PARALLEL QUERIES (Minimal queries for speed)
    ─────────────────────── */
    const [staffCount, attendanceStats, salaryAggregate, cashbookBalance] =
      await Promise.all([
        // Staff count - minimal query
        prisma.user.count({
          where: {
            companyId,
            role: "STAFF",
            status: "ACTIVE",
          },
        }),

        // Attendance today - optimized count
        prisma.attendance.groupBy({
          by: ["status"],
          where: {
            companyId,
            attendanceDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          _count: {
            status: true,
          },
        }),

        // Monthly salary - aggregate
        prisma.salary.aggregate({
          where: {
            companyId,
            month: currentMonth,
            year: currentYear,
          },
          _sum: {
            netAmount: true,
          },
        }),

        // Cashbook balance - single query with conditional sum
        prisma.cashbookEntry.aggregate({
          where: {
            companyId,
            isReversed: false,
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

    /* ───────────────────────
       5️⃣ PROCESS ATTENDANCE (Fast object lookup)
    ─────────────────────── */
    const attendance = {
      approved:
        attendanceStats.find((s) => s.status === "APPROVED")?._count?.status ??
        0,
      absent:
        attendanceStats.find((s) => s.status === "ABSENT")?._count?.status ?? 0,
      pending:
        attendanceStats.find((s) => s.status === "PENDING")?._count?.status ??
        0,
    };

    // Cashbook balance (credits - debits)
    const totalCredits = cashbookBalance._sum.amount || 0;

    /* ───────────────────────
       6️⃣ RESPONSE with Caching Headers
    ─────────────────────── */
    const response = NextResponse.json({
      staffCount,
      attendance,
      monthlySalaryTotal: salaryAggregate._sum.netAmount || 0,
      cashbookBalance: totalCredits,
    });

    // Cache for 60 seconds, stale-while-revalidate for 5 minutes
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );

    return response;
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
