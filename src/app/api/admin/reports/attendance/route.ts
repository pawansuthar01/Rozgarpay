import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";
import { generateAttendancePDFBuffer } from "@/lib/attendanceReportGenerator";

export const dynamic = "force-dynamic";

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

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );
    const offset = (page - 1) * limit;

    // ✅ Admin company
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

    // ✅ Date filter (IST safe)
    let dateWhere: any = {};
    let start: Date | null = null;
    let end: Date | null = null;

    if (startDate && endDate) {
      start = getDate(new Date(startDate));
      end = getDate(new Date(endDate));
      end.setUTCHours(23, 59, 59, 999);

      dateWhere = {
        attendanceDate: {
          gte: start,
          lte: end,
        },
      };
    }

    // ✅ Total records
    const totalRecords = await prisma.attendance.count({
      where: {
        companyId: admin.company.id,
        user: { role: "STAFF" },
        ...dateWhere,
      },
    });

    // ✅ Status counts (timezone safe)
    const statusCounts = await prisma.attendance.groupBy({
      by: ["status"],
      where: {
        companyId: admin.company.id,
        user: { role: "STAFF" },
        ...dateWhere,
      },
      _count: true,
    });

    const present =
      statusCounts.find((s) => s.status === "APPROVED")?._count || 0;
    const absent = statusCounts.find((s) => s.status === "ABSENT")?._count || 0;
    const late = statusCounts.find((s) => s.status === "PENDING")?._count || 0;

    // ✅ Daily trends
    const trendsRaw = await prisma.attendance.groupBy({
      by: ["attendanceDate", "status"],
      where: {
        companyId: admin.company.id,
        user: { role: "STAFF" },
        ...dateWhere,
      },
      _count: true,
      orderBy: { attendanceDate: "asc" },
    });

    const trendsMap = new Map<
      string,
      { date: string; present: number; absent: number; late: number }
    >();

    trendsRaw.forEach((t) => {
      const dateStr = t.attendanceDate.toISOString().split("T")[0];
      if (!trendsMap.has(dateStr)) {
        trendsMap.set(dateStr, {
          date: dateStr,
          present: 0,
          absent: 0,
          late: 0,
        });
      }
      const day = trendsMap.get(dateStr)!;
      if (t.status === "APPROVED") day.present += t._count;
      if (t.status === "ABSENT") day.absent += t._count;
      if (t.status === "PENDING") day.late += t._count;
    });

    const trends = Array.from(trendsMap.values());

    // ✅ Staff summary (proper pagination)
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
        attendances: {
          where: dateWhere,
          select: { status: true },
        },
      },
      skip: offset,
      take: limit,
      orderBy: { firstName: "asc" },
    });

    const staffSummary = staff.map((u) => ({
      userId: u.id,
      user: {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
      },
      present: u.attendances.filter((a) => a.status === "APPROVED").length,
      absent: u.attendances.filter((a) => a.status === "ABSENT").length,
      late: u.attendances.filter((a) => a.status === "PENDING").length,
    }));

    // ✅ PDF generation
    if (format === "pdf") {
      const pdfBuffer = generateAttendancePDFBuffer({
        company: admin.company,
        totalRecords,
        present,
        absent,
        late,
        trends,
        staffSummary,
        generatedBy: {
          firstName: session.user.firstName ?? null,
          lastName: session.user.lastName ?? null,
        },
        dateRange: { startDate, endDate },
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=attendance-report-${
            new Date().toISOString().split("T")[0]
          }.pdf`,
        },
      });
    }

    return NextResponse.json({
      totalRecords,
      present,
      absent,
      late,
      trends,
      staffSummary,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    console.error("Attendance report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
