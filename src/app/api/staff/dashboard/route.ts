import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get user info with company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get today's attendance
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        attendanceDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get last attendance (excluding today)
    const lastAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        attendanceDate: {
          lt: today,
        },
      },
      orderBy: {
        attendanceDate: "desc",
      },
    });

    // Get recent notifications
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
    });

    // Determine today's status
    let status: "not_punched" | "punched_in" | "punched_out" | "pending" =
      "not_punched";
    if (todayAttendance) {
      if (todayAttendance.status === "PENDING") {
        status = "pending";
      } else if (todayAttendance.punchOut) {
        status = "punched_out";
      } else if (todayAttendance.punchIn) {
        status = "punched_in";
      }
    }

    const dashboardData = {
      user: {
        firstName: user?.firstName,
        lastName: user?.lastName,
        companyName: user?.company?.name,
      },
      todayAttendance: {
        status,
        punchInTime: todayAttendance?.punchIn?.toISOString(),
        punchOutTime: todayAttendance?.punchOut?.toISOString(),
        lastAttendance: lastAttendance
          ? {
              date: lastAttendance.attendanceDate.toISOString(),
              punchIn: lastAttendance?.punchIn?.toISOString(),
              punchOut: lastAttendance.punchOut?.toISOString(),
              status: lastAttendance.status,
            }
          : undefined,
      },
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.channel === "EMAIL" ? "info" : "success",
        createdAt: notification.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Staff dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
