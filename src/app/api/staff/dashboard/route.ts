import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";
export const dynamic = "force-dynamic";
// Helper function to create welcome notification
async function createWelcomeNotification(
  userId: string,
  companyId: string,
  firstName: string | null,
  companyName: string | null,
): Promise<void> {
  try {
    // Check if welcome notification already exists (to avoid duplicates)
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId,
        title: "Welcome to Rozgarpay!",
      },
    });

    if (existingNotification) {
      return; // Already created welcome notification
    }

    await prisma.notification.create({
      data: {
        userId,
        companyId,
        title: "Welcome to Rozgarpay!",
        message: `Hi ${firstName || "there"}! Welcome to ${companyName || "our company"}. We're excited to have you on board. Your salary setup is in progress - please contact your admin for any questions.`,
        channel: "IN_APP",
        status: "SENT",
      },
    });
  } catch (error: any) {
    // Handle connection errors gracefully
    if (
      error.code === "P1017" ||
      error.message?.includes("closed the connection")
    ) {
      console.warn(
        "Database connection issue, skipping welcome notification:",
        error.message,
      );
    } else {
      console.error("Failed to create welcome notification:", error);
    }
    // Don't throw - notification failure shouldn't break dashboard
  }
}

// Helper function to create salary setup pending notification
async function createSalaryPendingNotification(
  userId: string,
  companyId: string,
): Promise<void> {
  try {
    // Check if already exists
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId,
        title: "Salary Setup Pending",
      },
    });

    if (existingNotification) {
      return; // Already exists
    }

    await prisma.notification.create({
      data: {
        userId,
        companyId,
        title: "Salary Setup Pending",
        message:
          "Your salary has not been configured yet. Please contact your administrator to set up your salary details. Once your salary is configured, you'll be able to view your attendance and salary information.",
        channel: "IN_APP",
        status: "SENT",
        meta: JSON.stringify({
          type: "salary_pending",
          requiresAction: true,
        }),
      },
    });
  } catch (error: any) {
    // Handle connection errors gracefully
    if (
      error.code === "P1017" ||
      error.message?.includes("closed the connection")
    ) {
      console.warn(
        "Database connection issue, skipping salary pending notification:",
        error.message,
      );
    } else {
      console.error("Failed to create salary pending notification:", error);
    }
    // Don't throw - notification failure shouldn't break dashboard
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;
    const today = getDate(new Date());
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

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
        salarySetupDone: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if salary is configured
    const salaryConfigured = user.salarySetupDone;

    // If salary is not configured, create pending notification
    if (!salaryConfigured) {
      await createSalaryPendingNotification(userId, companyId);
    }

    // Create welcome notification if user was created in the last 5 minutes (first login scenario)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (user.createdAt > fiveMinutesAgo) {
      await createWelcomeNotification(
        userId,
        companyId,
        user.firstName,
        user?.company?.name || "",
      );
    }

    // Get recent notifications (with error handling for connection issues)
    let notifications: any[] = [];
    try {
      notifications = await prisma.notification.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      });
    } catch (notifError: any) {
      if (
        notifError.code === "P1017" ||
        notifError.message?.includes("closed the connection")
      ) {
        console.warn(
          "Database connection issue, skipping notifications fetch:",
          notifError.message,
        );
        notifications = [];
      } else {
        throw notifError; // Re-throw other errors
      }
    }

    const dashboardData = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.company?.name,
      },
      salarySetup: {
        isConfigured: salaryConfigured,
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
