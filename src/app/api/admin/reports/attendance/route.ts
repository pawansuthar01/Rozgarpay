import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
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

    const dateFilter =
      startDate && endDate
        ? {
            attendanceDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        : {};

    // Total records
    const totalRecords = await prisma.attendance.count({
      where: {
        companyId: admin.company.id,
        user: { role: "STAFF" },
        ...dateFilter,
      },
    });

    // Status counts
    const statusCounts = await prisma.attendance.groupBy({
      by: ["status"],
      where: {
        companyId: admin.company.id,
        user: { role: "STAFF" },
        ...dateFilter,
      },
      _count: true,
    });

    const present =
      statusCounts.find((s) => s.status === "APPROVED")?._count || 0;
    const absent =
      statusCounts.find((s) => s.status === "REJECTED")?._count || 0;
    const late = statusCounts.find((s) => s.status === "PENDING")?._count || 0; // Assuming late is pending

    // Daily trends
    const trends = await prisma.attendance.groupBy({
      by: ["attendanceDate", "status"],
      where: {
        companyId: admin.company.id,
        user: { role: "STAFF" },
        ...dateFilter,
      },
      _count: true,
      orderBy: {
        attendanceDate: "asc",
      },
    });

    const trendsMap = new Map();
    trends.forEach((t) => {
      const date = t.attendanceDate.toISOString().split("T")[0];
      if (!trendsMap.has(date)) {
        trendsMap.set(date, { date, present: 0, absent: 0, late: 0 });
      }
      const day = trendsMap.get(date);
      if (t.status === "APPROVED") day.present = t._count;
      else if (t.status === "REJECTED") day.absent = t._count;
      else if (t.status === "PENDING") day.late = t._count;
    });

    const trendsData = Array.from(trendsMap.values());

    // Staff summary
    const staff = await prisma.user.findMany({
      where: {
        companyId: admin.company.id,
        role: "STAFF",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const staffSummary = await Promise.all(
      staff.map(async (user) => {
        const userStats = await prisma.attendance.groupBy({
          by: ["status"],
          where: {
            userId: user.id,
            ...dateFilter,
          },
          _count: true,
        });

        return {
          userId: user.id,
          user,
          present: userStats.find((s) => s.status === "APPROVED")?._count || 0,
          absent: userStats.find((s) => s.status === "REJECTED")?._count || 0,
          late: userStats.find((s) => s.status === "PENDING")?._count || 0,
        };
      }),
    );

    // Paginate staff summary
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStaff = staffSummary.slice(startIndex, endIndex);
    const totalPages = Math.ceil(staffSummary.length / limit);

    return NextResponse.json({
      totalRecords,
      present,
      absent,
      late,
      trends: trendsData,
      staffSummary: paginatedStaff,
      totalPages,
    });
  } catch (error) {
    console.error("Attendance report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
