import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";
import { toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get("year") ||
        toZonedTime(new Date(), "Asia/Kolkata").getFullYear().toString(),
    );
    const month = parseInt(
      searchParams.get("month") ||
        (toZonedTime(new Date(), "Asia/Kolkata").getMonth() + 1).toString(),
    );

    // Get start and end dates for the month
    const startDate = getDate(new Date(year, month - 1, 1));
    const endDate = getDate(new Date(year, month, 1));

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        attendanceDate: true,
        punchIn: true,
        punchOut: true,
        status: true,
      },
      orderBy: {
        attendanceDate: "asc",
      },
    });

    const records = attendanceRecords.map((record) => ({
      date: record.attendanceDate.toISOString(),
      punchIn: record.punchIn?.toISOString() || null,
      punchOut: record.punchOut?.toISOString() || null,
      status: record.status,
    }));

    // Cache at CDN for 5 minutes, browser for 5 minutes
    return NextResponse.json(records, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Staff attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
