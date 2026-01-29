import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendanceRecord = await prisma.attendance.findFirst({
      where: {
        userId,
        companyId,
        attendanceDate: today,
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
