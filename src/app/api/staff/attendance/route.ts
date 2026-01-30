import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
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
      searchParams.get("year") || new Date().getFullYear().toString(),
    );
    const month = parseInt(
      searchParams.get("month") || (new Date().getMonth() + 1).toString(),
    );

    // Get start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: startDate,
          lt: endDate,
        },
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

    return NextResponse.json(records);
  } catch (error) {
    console.error("Staff attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
