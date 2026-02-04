import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

// Cache for 2 minutes
const CACHE_CONTROL = "public, s-maxage=120, stale-while-revalidate=600";

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

    // Get admin's company with minimal fields
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const companyId = admin.companyId;
    const skip = (attendancePage - 1) * limit;
    const salarySkip = (salaryPage - 1) * limit;

    // PARALLEL QUERIES: Run all queries concurrently
    const [
      user,
      attendanceStats,
      totalAttendance,
      attendanceRecords,
      salaryStats,
      salaryRecords,
    ] = await Promise.all([
      // Get user details
      prisma.user.findFirst({
        where: { id: userId, companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          onboardingCompleted: true,
        },
      }),

      // Get attendance stats
      prisma.attendance.groupBy({
        by: ["status"],
        where: { userId, companyId },
        _count: true,
      }),

      // Count total attendance
      prisma.attendance.count({ where: { userId, companyId } }),

      // Get attendance records (paginated)
      prisma.attendance.findMany({
        where: { userId, companyId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),

      // Get salary stats
      prisma.salary.aggregate({
        where: { userId, companyId },
        _count: true,
        _sum: { grossAmount: true, netAmount: true },
      }),

      // Get salary records (paginated)
      prisma.salary.findMany({
        where: { userId, companyId },
        orderBy: { createdAt: "desc" },
        skip: salarySkip,
        take: limit,
        select: {
          id: true,
          month: true,
          year: true,
          grossAmount: true,
          netAmount: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    // Calculate monthly attendance trend (last 6 months) - limited data
    const sixMonthsAgo = getDate(new Date());
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const attendanceTrendData = await prisma.attendance.findMany({
      where: {
        userId,
        companyId,
        attendanceDate: { gte: sixMonthsAgo },
      },
      select: { attendanceDate: true },
      orderBy: { attendanceDate: "asc" },
    });

    // Group by month manually
    const monthlyAttendance = attendanceTrendData.reduce(
      (acc: any[], record) => {
        const monthKey = record.attendanceDate.toISOString().substring(0, 7);
        const existing = acc.find((item) => item.month === monthKey);
        if (existing) existing.count += 1;
        else acc.push({ month: monthKey, count: 1 });
        return acc;
      },
      [],
    );

    // Calculate salary trend (last 6 months)
    const salaryTrendData = await prisma.salary.findMany({
      where: { userId, companyId },
      select: { year: true, month: true, grossAmount: true, netAmount: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    const monthlySalary = salaryTrendData.reduce((acc: any[], record) => {
      const periodKey = `${record.year}-${record.month.toString().padStart(2, "0")}`;
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

    const response = NextResponse.json({
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

    response.headers.set("Cache-Control", CACHE_CONTROL);
    return response;
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
