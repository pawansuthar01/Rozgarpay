import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

import { prisma } from "@/lib/prisma";
import { getDate } from "@/lib/attendanceUtils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const today = getDate(new Date());
    const startOfDay = today;
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const attendanceRecord = await prisma.attendance.findFirst({
      where: {
        userId,
        companyId,
        attendanceDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        status: true,
        punchIn: true,
        punchOut: true,
        attendanceDate: true,
        workingHours: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      attendance: attendanceRecord,
    });

    response.headers.set("Cache-Control", "private, no-store, max-age=0");

    return response;
  } catch (error) {
    console.error("Today's attendance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch today's attendance" },
      { status: 500 },
    );
  }
}
