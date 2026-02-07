import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import authOptions from "@/lib/auth";

export const dynamic = "force-dynamic";

function getLocalDate(date: Date): Date {
  // Create a date at midnight in local timezone
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return localDate;
}

function formatDateKey(date: Date): string {
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return localDate.toISOString().split("T")[0];
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allDates: string[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      allDates.push(formatDateKey(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get existing attendance for the user in the date range
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await prisma.attendance.findMany({
      where: {
        userId: userId,
        companyId: admin.companyId,
        attendanceDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        attendanceDate: true,
      },
    });

    const attendedDates = new Set(
      existingAttendance.map((a) => formatDateKey(a.attendanceDate)),
    );

    // Find missing dates (dates without attendance)
    const missingDates = allDates.filter((date) => !attendedDates.has(date));

    // Sort by date descending
    missingDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return NextResponse.json({
      userId,
      totalDays: allDates.length,
      presentDays: existingAttendance.length,
      missingDays: missingDates.length,
      missingDates: missingDates.map((date) => {
        const dateObj = new Date(date);
        return {
          date: dateObj.toISOString(),
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
