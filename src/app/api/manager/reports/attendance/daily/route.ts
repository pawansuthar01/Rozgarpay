import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

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

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Date range required" },
        { status: 400 },
      );
    }

    // Get total staff count
    const totalStaff = await prisma.user.count({
      where: {
        companyId,
        role: { in: ["STAFF"] },
        status: "ACTIVE",
      },
    });

    // Get daily attendance summary using Prisma aggregation
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        companyId,
        attendanceDate: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
      select: {
        attendanceDate: true,
        status: true,
        punchIn: true,
      },
    });

    // Group by date and calculate statistics
    const dailyStats = new Map();

    attendanceRecords.forEach((record) => {
      const dateKey = record.attendanceDate.toISOString().split("T")[0];

      if (!dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, {
          date: dateKey,
          total_records: 0,
          present: 0,
          absent: 0,
          pending: 0,
          late: 0,
        });
      }

      const day = dailyStats.get(dateKey);
      day.total_records++;

      if (record?.punchIn && record.status === "APPROVED") {
        day.present++;

        const punchTime = new Date(record?.punchIn);
        const lateThreshold = new Date(record.attendanceDate);
        lateThreshold.setHours(9, 30, 0, 0);
        if (punchTime > lateThreshold) {
          day.late++;
        }
      } else if (record.status === "REJECTED") {
        day.absent++;
      } else if (record.status === "PENDING") {
        day.pending++;
      }
    });

    const dailyAttendance = Array.from(dailyStats.values())
      .map((day) => ({
        ...day,
        attendance_rate:
          day.total_records > 0
            ? Math.round((day.present / day.total_records) * 100 * 100) / 100
            : 0,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate late arrivals (assuming punch in after 9:30 AM)
    const dailySummary = await Promise.all(
      (dailyAttendance as any[]).map(async (day) => {
        const dayDate = new Date(day.date);
        const lateCount = await prisma.attendance.count({
          where: {
            companyId,
            attendanceDate: dayDate,
            punchIn: {
              gt: new Date(
                dayDate.toISOString().split("T")[0] + "T09:30:00.000Z",
              ),
            },
            status: "APPROVED",
          },
        });

        return {
          date: day.date.toISOString(),
          totalStaff,
          present: parseInt(day.present),
          absent: parseInt(day.absent),
          late: lateCount,
          attendanceRate: parseFloat(day.attendance_rate) || 0,
        };
      }),
    );

    return NextResponse.json({
      summary: dailySummary,
    });
  } catch (error) {
    console.error("Manager daily attendance report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
