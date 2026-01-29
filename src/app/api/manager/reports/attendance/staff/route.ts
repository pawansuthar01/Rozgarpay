import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Date range required" },
        { status: 400 },
      );
    }

    // Get staff with their attendance statistics using Prisma
    const staffWithAttendance = await prisma.user.findMany({
      where: {
        companyId,
        role: { in: ["STAFF", "ACCOUNTANT"] },
        status: "ACTIVE",
      },
      include: {
        attendances: {
          where: {
            attendanceDate: {
              gte: new Date(dateFrom),
              lte: new Date(dateTo),
            },
          },
        },
      },
      orderBy: {
        firstName: "asc",
      },
      skip,
      take: limit,
    });

    // Calculate statistics for each staff member
    const staffStats = staffWithAttendance
      .map((user) => {
        const attendances = user.attendances;
        const totalDays = attendances.length;
        const presentDays = attendances.filter(
          (a) => a.status === "APPROVED",
        ).length;
        const absentDays = attendances.filter(
          (a) => a.status === "REJECTED",
        ).length;
        const lateDays = attendances.filter((a) => {
          if (a.status !== "APPROVED") return false;
          const punchTime = new Date(a?.punchIn || 0);
          const lateThreshold = new Date(a.attendanceDate);
          lateThreshold.setHours(9, 30, 0, 0);
          return punchTime > lateThreshold;
        }).length;

        const attendanceRate =
          totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        const lastAttendance =
          attendances.length > 0
            ? attendances
                .sort(
                  (a, b) =>
                    new Date(b.attendanceDate).getTime() -
                    new Date(a.attendanceDate).getTime(),
                )[0]
                .attendanceDate.toISOString()
            : null;

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          total_days: totalDays,
          present_days: presentDays,
          absent_days: absentDays,
          late_days: lateDays,
          attendance_rate: Math.round(attendanceRate * 100) / 100,
          last_attendance: lastAttendance,
        };
      })
      .sort((a, b) => b.attendance_rate - a.attendance_rate);

    // Get total count for pagination
    const totalCount = await prisma.user.count({
      where: {
        companyId,
        role: { in: ["STAFF", "ACCOUNTANT"] },
        status: "ACTIVE",
      },
    });

    const staff = (staffStats as any[]).map((stat) => ({
      id: stat.id,
      name:
        `${stat.firstName || ""} ${stat.lastName || ""}`.trim() || stat.email,
      totalDays: parseInt(stat.total_days),
      presentDays: parseInt(stat.present_days),
      absentDays: parseInt(stat.absent_days),
      lateDays: parseInt(stat.late_days),
      attendanceRate: parseFloat(stat.attendance_rate) || 0,
      lastAttendance: stat.last_attendance
        ? new Date(stat.last_attendance).toISOString()
        : null,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      staff,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Manager staff attendance report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
