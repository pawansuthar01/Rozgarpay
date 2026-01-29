import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
       2️⃣ GET COMPANY
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
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    /* ───────────────────────
       4️⃣ PARALLEL QUERIES
    ─────────────────────── */
    const [
      staffCount,
      attendanceStats,
      salaryAggregate,
      creditSum,
      debitSum,
      recentAuditLogs,
    ] = await Promise.all([
      // Staff count
      prisma.user.count({
        where: {
          companyId,
          role: "STAFF",
          status: "ACTIVE",
        },
      }),

      // Attendance today
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

      // Monthly salary
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

      // Cashbook CREDIT
      prisma.cashbookEntry.aggregate({
        where: {
          companyId,
          isReversed: false,
          direction: "CREDIT",
        },
        _sum: {
          amount: true,
        },
      }),

      // Cashbook DEBIT
      prisma.cashbookEntry.aggregate({
        where: {
          companyId,
          isReversed: false,
          direction: "DEBIT",
        },
        _sum: {
          amount: true,
        },
      }),

      // Recent activity
      prisma.auditLog.findMany({
        where: {
          user: {
            companyId,
          },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    /* ───────────────────────
       5️⃣ PROCESS ATTENDANCE
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

    /* ───────────────────────
       6️⃣ CASHBOOK BALANCE
    ─────────────────────── */
    const cashbookBalance =
      (creditSum._sum.amount || 0) - (debitSum._sum.amount || 0);

    /* ───────────────────────
       7️⃣ ACTIVITY LOGS
    ─────────────────────── */
    const recentActivity = recentAuditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      user:
        `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() ||
        log.user.email,
      timestamp: log.createdAt.toISOString(),
    }));

    /* ───────────────────────
       8️⃣ RESPONSE
    ─────────────────────── */
    return NextResponse.json({
      staffCount,
      attendance,
      monthlySalaryTotal: salaryAggregate._sum.netAmount || 0,
      cashbookBalance,
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
