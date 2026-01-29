import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      teamSize,
      todaysAttendances,
      pendingAttendanceApprovals,
      recentTeamActivity,
    ] = await Promise.all([
      // Team size: count of active staff in the company
      prisma.user.count({
        where: {
          companyId,
          role: { in: ["STAFF", "ACCOUNTANT"] },
          status: "ACTIVE",
        },
      }),

      // Today's attendance summary
      prisma.attendance.groupBy({
        by: ["status"],
        where: {
          companyId,
          attendanceDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        _count: true,
      }),

      // Pending attendance approvals
      prisma.attendance.findMany({
        where: {
          companyId,
          status: "PENDING",
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
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),

      // Recent team activity (audit logs)
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
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    // Calculate attendance counts
    const present =
      todaysAttendances.find((a) => a.status === "APPROVED")?._count || 0;
    const absent =
      teamSize -
      present -
      (todaysAttendances.find((a) => a.status === "PENDING")?._count || 0);
    const pendingApprovals =
      todaysAttendances.find((a) => a.status === "PENDING")?._count || 0;

    return NextResponse.json({
      teamSize,
      todaysAttendance: {
        present,
        absent: Math.max(0, absent), // Ensure not negative
        pendingApprovals,
      },
      pendingAttendanceApprovals: pendingAttendanceApprovals.map(
        (attendance) => ({
          id: attendance.id,
          user:
            `${attendance.user.firstName || ""} ${attendance.user.lastName || ""}`.trim() ||
            attendance.user.email,
          timestamp: attendance.createdAt.toISOString(),
        }),
      ),
      recentTeamActivity: recentTeamActivity.map((log) => ({
        id: log.id,
        action: `${log.action} ${log.entity}`,
        user:
          `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() ||
          log.user.email,
        timestamp: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Manager stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
