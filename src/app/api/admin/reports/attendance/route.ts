import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
import { generateAttendancePDFBuffer } from "@/lib/attendanceReportGenerator";
import { getDate } from "@/lib/attendanceUtils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "json";
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
              gte: getDate(new Date(startDate)),
              lte: getDate(new Date(endDate)),
            },
          }
        : {};

    // Parse dates for raw SQL query
    const startDateFilter = startDate
      ? new Date(startDate).toISOString().split("T")[0]
      : null;
    const endDateFilter = endDate
      ? new Date(endDate).toISOString().split("T")[0]
      : null;

    // Total records
    const totalRecords = await prisma.attendance.count({
      where: {
        companyId: admin.company.id,
        user: { role: "STAFF" },
        ...dateFilter,
      },
    });

    // Status counts - OPTIMIZED: Combined into single query
    const statusCountsRaw = await prisma.$queryRaw<
      Array<{ status: string; count: bigint }>
    >`
      SELECT 
        status,
        COUNT(*) as count
      FROM "attendances"
      WHERE "companyId" = ${admin.company.id}
        AND "userId" IN (SELECT id FROM "users" WHERE role = 'STAFF')
        AND "attendanceDate" >= ${startDateFilter}::date 
        AND "attendanceDate" <= ${endDateFilter}::date
      GROUP BY status
    `;

    const statusCounts = statusCountsRaw.map((s) => ({
      status: s.status,
      count: Number(s.count),
    }));

    const present =
      statusCounts.find((s) => s.status === "APPROVED")?.count || 0;
    const absent =
      statusCounts.find((s) => s.status === "REJECTED")?.count || 0;
    const late = statusCounts.find((s) => s.status === "PENDING")?.count || 0;

    // Daily trends - OPTIMIZED: Raw SQL for faster processing
    const trendsRaw = await prisma.$queryRaw<
      Array<{ date: Date; status: string; count: bigint }>
    >`
      SELECT 
        "attendanceDate"::date as date,
        status,
        COUNT(*) as count
      FROM "attendances"
      WHERE "companyId" = ${admin.company.id}
        AND "userId" IN (SELECT id FROM "users" WHERE role = 'STAFF')
        AND "attendanceDate" >= ${startDateFilter}::date 
        AND "attendanceDate" <= ${endDateFilter}::date
      GROUP BY "attendanceDate"::date, status
      ORDER BY date ASC
    `;

    const trendsMap = new Map<
      string,
      {
        date: string;
        present: number;
        absent: number;
        late: number;
      }
    >();
    trendsRaw.forEach((t) => {
      const dateStr = t.date.toISOString().split("T")[0];
      if (!trendsMap.has(dateStr)) {
        trendsMap.set(dateStr, {
          date: dateStr,
          present: 0,
          absent: 0,
          late: 0,
        });
      }
      const day = trendsMap.get(dateStr)!;
      if (t.status === "APPROVED") day.present = Number(t.count);
      else if (t.status === "REJECTED") day.absent = Number(t.count);
      else if (t.status === "PENDING") day.late = Number(t.count);
    });

    const trendsData = Array.from(trendsMap.values());

    // Staff summary - OPTIMIZED: Single query with aggregation instead of N+1
    const staffStatsRaw = await prisma.$queryRaw<
      Array<{
        userId: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        present: bigint;
        absent: bigint;
        late: bigint;
      }>
    >`
      SELECT 
        u.id as "userId",
        u."firstName",
        u."lastName",
        u.email,
        COUNT(a.id) FILTER (WHERE a.status = 'APPROVED') as present,
        COUNT(a.id) FILTER (WHERE a.status = 'REJECTED') as absent,
        COUNT(a.id) FILTER (WHERE a.status = 'PENDING') as late
      FROM "users" u
      LEFT JOIN "attendances" a ON u.id = a."userId" 
        AND a."attendanceDate" >= ${startDateFilter}::date 
        AND a."attendanceDate" <= ${endDateFilter}::date
      WHERE u."companyId" = ${admin.company.id} 
        AND u.role = 'STAFF'
      GROUP BY u.id, u."firstName", u."lastName", u.email
      ORDER BY u."firstName" ASC
      LIMIT ${limit} OFFSET ${0}
    `;

    // Get total count for pagination
    const totalStaff = await prisma.user.count({
      where: {
        companyId: admin.company.id,
        role: "STAFF",
      },
    });

    const staffSummary = staffStatsRaw.map((s) => ({
      userId: s.userId,
      user: {
        id: s.userId,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
      },
      present: Number(s.present) || 0,
      absent: Number(s.absent) || 0,
      late: Number(s.late) || 0,
    }));

    if (format === "pdf") {
      // Generate PDF report
      const pdfData = {
        company: admin.company,
        totalRecords,
        present,
        absent,
        late,
        trends: trendsData,
        staffSummary: staffSummary,
        generatedBy: {
          firstName: session.user.firstName ?? null,
          lastName: session.user.lastName ?? null,
          phone: session.user.phone ?? null,
        },
        dateRange: {
          startDate,
          endDate,
        },
      };

      const pdfBuffer = generateAttendancePDFBuffer(pdfData);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=attendance-report-${getDate(new Date()).toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    // Paginate staff summary for JSON response
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
