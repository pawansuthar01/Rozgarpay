import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import authOptions from "@/lib/auth";
import { format, addDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
const TZ = "Asia/Kolkata";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: routeUserId } = await params;
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    console.log("Missing attendance API called:");
    console.log("URL:", request.url);
    console.log("Route userId:", routeUserId);
    console.log("startDate:", startDateStr);
    console.log("endDate:", endDateStr);

    // Use route userId, fallback to query param if needed
    const userId = routeUserId || searchParams.get("userId");

    if (!userId || !startDateStr || !endDateStr) {
      console.log(
        "Missing required parameters - userId:",
        userId,
        "startDate:",
        startDateStr,
        "endDate:",
        endDateStr,
      );
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

    // Parse dates
    const startDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);

    // Generate all dates between start and end
    const allDates: string[] = [];
    let currentDate = startOfDay(startDate);
    const endOfRange = endOfDay(endDate);

    while (currentDate <= endOfRange) {
      // Format date as YYYY-MM-DD in IST timezone
      const istDate = toZonedTime(currentDate, TZ);
      allDates.push(format(istDate, "yyyy-MM-dd"));
      currentDate = addDays(currentDate, 1);
    }

    // Get existing attendance for the user in the date range
    const startOfDayUTC = startOfDay(startDate);
    const endOfDayUTC = endOfDay(endDate);

    const existingAttendance = await prisma.attendance.findMany({
      where: {
        userId,
        companyId: admin.companyId,
        attendanceDate: {
          gte: startOfDayUTC,
          lte: endOfDayUTC,
        },
      },
      select: { attendanceDate: true },
    });

    // Convert attended dates to IST date strings
    const attendedDates = new Set(
      existingAttendance.map((a) => {
        const istDate = toZonedTime(a.attendanceDate, TZ);
        return format(istDate, "yyyy-MM-dd");
      }),
    );

    // Find missing dates
    const missingDates = allDates.filter((d) => !attendedDates.has(d));
    // Sort by date descending (newest first)
    missingDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return NextResponse.json({
      userId,
      totalDays: allDates.length,
      presentDays: existingAttendance.length,
      missingDays: missingDates.length,
      missingDates: missingDates.map((date) => {
        const dateObj = parseISO(date);
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
