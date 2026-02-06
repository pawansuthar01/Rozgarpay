import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { fromZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

const IST = "Asia/Kolkata";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: IST }),
    );

    const year = Number(searchParams.get("year")) || nowIST.getFullYear();
    const month = Number(searchParams.get("month")) || nowIST.getMonth() + 1;

    // ✅ IST month boundaries → UTC
    const istMonthStart = new Date(year, month - 1, 1, 0, 0, 0);
    const istMonthEnd = new Date(year, month, 1, 0, 0, 0);

    const startDate = fromZonedTime(istMonthStart, IST);
    const endDate = fromZonedTime(istMonthEnd, IST);

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
      orderBy: { attendanceDate: "asc" },
    });

    const records = attendanceRecords.map((r) => ({
      date: r.attendanceDate.toISOString().split("T")[0],
      punchIn: r.punchIn?.toISOString() ?? null,
      punchOut: r.punchOut?.toISOString() ?? null,
      status: r.status,
    }));

    return NextResponse.json(records, {
      headers: {
        "Cache-Control": "private, max-age=0",
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
