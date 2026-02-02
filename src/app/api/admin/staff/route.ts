import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status"); // ACTIVE, SUSPENDED, DEACTIVATED
    const attendanceStatus = searchParams.get("attendanceStatus"); // PENDING, APPROVED, REJECTED
    const search = searchParams.get("search");

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    // Build where clause for staff only
    const where: any = {
      companyId: admin.company.id,
      role: "STAFF", // Only staff members
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await prisma.user.count({ where });
    const totalPages = Math.ceil(total / limit);

    // Get staff with their latest attendance
    const staff = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        attendances: {
          where: {
            attendanceDate: {
              gte: getDate(
                new Date(
                  getDate(new Date()).setDate(
                    getDate(new Date()).getDate() - 30,
                  ),
                ),
              ), // Last 30 days
            },
          },
          orderBy: { attendanceDate: "desc" },
          take: 1, // Latest attendance
        },
        salaries: {
          where: {
            month: getDate(new Date()).getMonth() + 1,
            year: getDate(new Date()).getFullYear(),
          },
          take: 1, // Current month salary
        },
      },
    });

    // Get today's attendance for each staff
    const today = getDate(new Date());
    today.setHours(0, 0, 0, 0);

    const staffWithTodayAttendance = await Promise.all(
      staff.map(async (member) => {
        const todayAttendance = await prisma.attendance.findFirst({
          where: {
            userId: member.id,
            attendanceDate: today,
          },
        });

        // Get attendance stats for the last 30 days
        const attendanceStats = await prisma.attendance.groupBy({
          by: ["status"],
          where: {
            userId: member.id,
            attendanceDate: {
              gte: getDate(
                new Date(
                  getDate(new Date()).setDate(
                    getDate(new Date()).getDate() - 30,
                  ),
                ),
              ),
            },
          },
          _count: true,
        });

        // Get pending attendance count
        const pendingCount = await prisma.attendance.count({
          where: {
            userId: member.id,
            status: "PENDING",
          },
        });

        return {
          ...member,
          todayAttendance,
          attendanceStats: {
            approved:
              attendanceStats.find((s) => s.status === "APPROVED")?._count || 0,
            pending:
              attendanceStats.find((s) => s.status === "PENDING")?._count || 0,
            rejected:
              attendanceStats.find((s) => s.status === "REJECTED")?._count || 0,
            total: attendanceStats.reduce((sum, stat) => sum + stat._count, 0),
          },
          pendingAttendanceCount: pendingCount,
          currentMonthSalary: member.salaries[0] || null,
        };
      }),
    );

    // Filter by attendance status if specified
    let filteredStaff = staffWithTodayAttendance;
    if (attendanceStatus) {
      if (attendanceStatus === "PENDING") {
        filteredStaff = staffWithTodayAttendance.filter(
          (s) => s.todayAttendance?.status === "PENDING",
        );
      } else if (attendanceStatus === "APPROVED") {
        filteredStaff = staffWithTodayAttendance.filter(
          (s) => s.todayAttendance?.status === "APPROVED",
        );
      } else if (attendanceStatus === "REJECTED") {
        filteredStaff = staffWithTodayAttendance.filter(
          (s) => s.todayAttendance?.status === "REJECTED",
        );
      } else if (attendanceStatus === "NOT_MARKED") {
        filteredStaff = staffWithTodayAttendance.filter(
          (s) => !s.todayAttendance,
        );
      }
    }

    // Get overall stats
    const totalStaff = await prisma.user.count({
      where: { companyId: admin.company.id, role: "STAFF" },
    });

    const activeStaff = await prisma.user.count({
      where: {
        companyId: admin.company.id,
        role: "STAFF",
        status: "ACTIVE",
      },
    });

    // Today's attendance stats
    const todayAttendanceStats = await prisma.attendance.groupBy({
      by: ["status"],
      where: {
        companyId: admin.company.id,
        attendanceDate: today,
        user: {
          role: "STAFF",
        },
      },
      _count: true,
    });

    const todayPresent =
      todayAttendanceStats.find((s) => s.status === "APPROVED")?._count || 0;
    const todayPending =
      todayAttendanceStats.find((s) => s.status === "PENDING")?._count || 0;

    // Get attendance trends for last 7 days
    const attendanceTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = getDate(new Date());
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayStats = await prisma.attendance.groupBy({
        by: ["status"],
        where: {
          companyId: admin.company.id,
          attendanceDate: date,
          user: { role: "STAFF" },
        },
        _count: true,
      });

      const present =
        dayStats.find((s) => s.status === "APPROVED")?._count || 0;
      const absent =
        totalStaff -
        present -
        (dayStats.find((s) => s.status === "PENDING")?._count || 0) -
        (dayStats.find((s) => s.status === "REJECTED")?._count || 0);

      attendanceTrends.push({
        date: date.toISOString().split("T")[0],
        present,
        absent,
      });
    }

    // Get salary distribution for current month
    const currentMonth = getDate(new Date()).getMonth() + 1;
    const currentYear = getDate(new Date()).getFullYear();

    const salaryStats = await prisma.salary.groupBy({
      by: ["status"],
      where: {
        user: {
          companyId: admin.company.id,
          role: "STAFF",
        },
        month: currentMonth,
        year: currentYear,
      },
      _count: true,
    });

    const salaryDistribution = {
      paid: salaryStats.find((s) => s.status === "PAID")?._count || 0,
      pending: salaryStats.find((s) => s.status === "PENDING")?._count || 0,
      processing:
        salaryStats.find((s) => s.status === "PROCESSING")?._count || 0,
    };

    return NextResponse.json({
      staff: filteredStaff,
      pagination: {
        page,
        limit,
        total: filteredStaff.length,
        totalPages: Math.ceil(filteredStaff.length / limit),
      },
      stats: {
        totalStaff,
        activeStaff,
        todayPresent,
        todayPending,
        todayAttendanceRate:
          totalStaff > 0 ? Math.round((todayPresent / totalStaff) * 100) : 0,
      },
      charts: {
        attendanceTrends,
        salaryDistribution,
      },
    });
  } catch (error) {
    console.error("Staff fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
