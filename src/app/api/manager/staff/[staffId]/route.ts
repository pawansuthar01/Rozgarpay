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

    const staffId = params.staffId;

    // Verify staff belongs to manager's company
    const staff = await prisma.user.findFirst({
      where: {
        id: staffId,
        companyId,
        role: { in: ["STAFF", "ACCOUNTANT"] },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Get attendance summary for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyAttendance = await prisma.attendance.findMany({
      where: {
        userId: staffId,
        attendanceDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const totalDays = monthlyAttendance.length;
    const presentDays = monthlyAttendance.filter(
      (a) => a.status === "APPROVED",
    ).length;
    const absentDays = monthlyAttendance.filter(
      (a) => a.status === "REJECTED",
    ).length;
    const pendingDays = monthlyAttendance.filter(
      (a) => a.status === "PENDING",
    ).length;
    const attendanceRate = totalDays > 0 ? presentDays / totalDays : 0;

    const profile = {
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      status: staff.status,
      createdAt: staff.createdAt.toISOString(),
    };

    const attendanceSummary = {
      totalDays,
      presentDays,
      absentDays,
      pendingDays,
      attendanceRate,
    };

    return NextResponse.json({
      profile,
      attendanceSummary,
    });
  } catch (error) {
    console.error("Manager staff profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
