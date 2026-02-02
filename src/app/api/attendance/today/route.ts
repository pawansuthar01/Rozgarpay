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
    const attendanceDate = getDate(new Date());

    const attendanceRecord = await prisma.attendance.findFirst({
      where: {
        userId,
        companyId,
        attendanceDate,
      },
    });
    return NextResponse.json({ success: true, attendance: attendanceRecord });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch today's attendance" },
      { status: 500 },
    );
  }
}
