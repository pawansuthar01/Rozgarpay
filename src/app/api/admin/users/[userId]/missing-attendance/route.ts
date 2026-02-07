import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import authOptions from "@/lib/auth";
import { toZonedTime, format, fromZonedTime } from "date-fns-tz";
const TZ = "Asia/Kolkata";
export const dynamic = "force-dynamic";

/** YYYY-MM-DD → UTC start of IST day */
function parseISTStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const ist = new Date(y, m - 1, d, 0, 0, 0, 0);
  return fromZonedTime(ist, TZ);
}

/** YYYY-MM-DD → UTC end of IST day */
function parseISTEnd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const ist = new Date(y, m - 1, d, 23, 59, 59, 999);
  return fromZonedTime(ist, TZ);
}

/** UTC → YYYY-MM-DD in IST */
function formatISTDate(date: Date): string {
  return format(toZonedTime(date, TZ), "yyyy-MM-dd", { timeZone: TZ });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!userId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "User ID, start date, and end date are required" },
        { status: 400 },
      );
    }

    // Verify user belongs to admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id, companyId: session.user.companyId },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true },
    });

    if (!targetUser || targetUser.companyId !== admin.companyId) {
      return NextResponse.json(
        { error: "User not found in your company" },
        { status: 404 },
      );
    }

    // Generate all dates between start and end
    // Date range (UTC, derived from IST)
    const start = parseISTStart(startDate);
    const end = parseISTEnd(endDate);
    const allDates: string[] = [];
    let cursor = toZonedTime(start, TZ);
    const endIST = toZonedTime(end, TZ);

    while (cursor <= endIST) {
      allDates.push(formatISTDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    // Get existing attendance for the user in the date range
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await prisma.attendance.findMany({
      where: {
        userId,
        companyId: admin.companyId,
        attendanceDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { attendanceDate: true },
    });

    // Convert attended dates to IST date strings
    const attendedDates = new Set(
      existingAttendance.map((a) => formatISTDate(a.attendanceDate)),
    );
    // Find missing dates
    const missingDates = allDates
      .filter((d) => !attendedDates.has(d))
      .sort((a, b) => b.localeCompare(a));
    // Sort by date descending (newest first)
    missingDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return NextResponse.json({
      userId,
      totalDays: allDates.length,
      presentDays: existingAttendance.length,
      missingDays: missingDates.length,
      missingDates: missingDates.map((date) => {
        const dateObj = new Date(date);
        return {
          date: date,
          formattedDate: dateObj.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        };
      }),
    });
  } catch (error) {
    console.error("User missing attendance fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
