import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function GET(request: Request, { params }: any) {
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

    const { attendanceId } = params;

    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        companyId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance not found" },
        { status: 404 },
      );
    }

    const attendanceDetail = {
      id: attendance.id,
      userName:
        `${attendance.user.firstName || ""} ${attendance.user.lastName || ""}`.trim() ||
        "Unnamed",
      userRole: attendance.user.role,
      attendanceDate: attendance.attendanceDate.toISOString(),
      punchIn: attendance.punchIn?.toISOString() || null,
      punchOut: attendance.punchOut?.toISOString() || null,
      status: attendance.status,
      imageUrl: attendance.punchInImageUrl,
      shiftDurationHours: attendance.shiftDurationHours,
    };

    return NextResponse.json(attendanceDetail);
  } catch (error) {
    console.error("Manager attendance detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
