import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function GET(
  request: NextRequest,
  { params }: { params: { attendanceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attendanceId } = params;

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 }
      );
    }

    // Fetch the attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        companyId: admin.company.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        approvedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Fetch user's attendance trends for chart (last 30 days)
    const trends = await prisma.attendance.groupBy({
      by: ["attendanceDate"],
      where: {
        userId: attendance.userId,
        attendanceDate: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
      },
      _count: true,
      orderBy: {
        attendanceDate: "asc",
      },
    });

    const attendanceTrends = trends.map((t) => ({
      date: t.attendanceDate.toISOString().split("T")[0],
      count: t._count,
    }));

    // Audit history: for now, just the current record, but can expand if audit model exists
    const auditHistory = [attendance];

    return NextResponse.json({
      attendance,
      auditHistory,
      charts: {
        attendanceTrends,
      },
    });
  } catch (error) {
    console.error("Attendance detail fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
