import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

export async function GET(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const attendancePage = parseInt(searchParams.get("attendancePage") || "1");
    const salaryPage = parseInt(searchParams.get("salaryPage") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

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

    // Get user details
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: admin.company.id,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get attendance summary
    const attendanceStats = await prisma.attendance.groupBy({
      by: ["status"],
      where: {
        userId,
        companyId: admin.company.id,
      },
      _count: true,
    });

    const totalAttendance = await prisma.attendance.count({
      where: {
        userId,
        companyId: admin.company.id,
      },
    });

    // Get recent attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId,
        companyId: admin.company.id,
      },
      orderBy: { createdAt: "desc" },
      skip: (attendancePage - 1) * limit,
      take: limit,
    });

    // Get salary summary
    const salaryStats = await prisma.salary.aggregate({
      where: {
        userId,
        companyId: admin.company.id,
      },
      _count: true,
      _sum: {
        grossAmount: true,
        netAmount: true,
      },
    });

    // Get recent salary records
    const salaryRecords = await prisma.salary.findMany({
      where: {
        userId,
        companyId: admin.company.id,
      },
      orderBy: { createdAt: "desc" },
      skip: (salaryPage - 1) * limit,
      take: limit,
    });

    // Calculate attendance status distribution
    const attendanceStatusData = attendanceStats.map((stat) => ({
      name: stat.status,
      value: stat._count,
      color:
        stat.status === "APPROVED"
          ? "#10B981"
          : stat.status === "PENDING"
            ? "#F59E0B"
            : "#EF4444",
    }));

    // Calculate monthly attendance trend (last 6 months) - simplified approach
    const sixMonthsAgo = getDate(new Date());
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get attendance records for trend calculation
    const attendanceTrendData = await prisma.attendance.findMany({
      where: {
        userId,
        companyId: admin.company.id,
        attendanceDate: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        attendanceDate: true,
      },
      orderBy: {
        attendanceDate: "asc",
      },
    });

    // Group by month manually
    const monthlyAttendance = attendanceTrendData.reduce(
      (acc: any[], record) => {
        const monthKey = record.attendanceDate.toISOString().substring(0, 7); // YYYY-MM format
        const existing = acc.find((item) => item.month === monthKey);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ month: monthKey, count: 1 });
        }
        return acc;
      },
      [],
    );

    // Calculate salary trend (last 6 months) - simplified approach
    const salaryTrendData = await prisma.salary.findMany({
      where: {
        userId,
        companyId: admin.company.id,
        // For simplicity, get all salaries and filter in JS
      },
      select: {
        year: true,
        month: true,
        grossAmount: true,
        netAmount: true,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    // Group salaries by month
    const monthlySalary = salaryTrendData.reduce((acc: any[], record) => {
      const periodKey = `${record.year}-${record.month
        .toString()
        .padStart(2, "0")}`;
      const existing = acc.find((item) => item.period === periodKey);
      if (existing) {
        existing.totalGross += record.grossAmount;
        existing.totalNet += record.netAmount;
      } else {
        acc.push({
          period: periodKey,
          totalGross: record.grossAmount,
          totalNet: record.netAmount,
        });
      }
      return acc;
    }, []);

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        onboardingCompleted: user.onboardingCompleted,
      },
      attendanceSummary: {
        total: totalAttendance,
        approved:
          attendanceStats.find((s) => s.status === "APPROVED")?._count || 0,
        pending:
          attendanceStats.find((s) => s.status === "PENDING")?._count || 0,
        rejected:
          attendanceStats.find((s) => s.status === "REJECTED")?._count || 0,
        statusData: attendanceStatusData,
        monthlyTrend: monthlyAttendance,
      },
      salarySummary: {
        totalRecords: salaryStats._count || 0,
        totalGross: salaryStats._sum.grossAmount || 0,
        totalNet: salaryStats._sum.netAmount || 0,
        monthlyTrend: monthlySalary,
      },
      attendanceRecords: {
        data: attendanceRecords,
        pagination: {
          page: attendancePage,
          limit,
          total: totalAttendance,
          totalPages: Math.ceil(totalAttendance / limit),
        },
      },
      salaryRecords: {
        data: salaryRecords,
        pagination: {
          page: salaryPage,
          limit,
          total: salaryStats._count || 0,
          totalPages: Math.ceil((salaryStats._count || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error("User details fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const { status } = await request.json();

    if (!["ACTIVE", "SUSPENDED", "DEACTIVATED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

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

    // Update user status
    const updatedUser = await prisma.user.updateMany({
      where: {
        id: userId,
        companyId: admin.company.id,
      },
      data: { status: status as any },
    });

    if (updatedUser.count === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "UPDATED",
          entity: "USER",
          entityId: userId,
          meta: {
            status,
            previousStatus: "unknown", // Could be enhanced to track previous status
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      message: "User status updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
