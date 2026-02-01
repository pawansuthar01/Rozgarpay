import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  NotificationChannel,
  NotificationType,
} from "@/lib/notifications/types";
import { notificationManager } from "@/lib/notifications/manager";

interface SendNotificationRequest {
  // Filter options
  role?: string[];
  companyId?: string;
  userIds?: string[];

  // Notification content
  title?: string;
  message?: string;
  type: NotificationType;
  data?: Record<string, any>;

  // Channels
  channels: NotificationChannel[];

  // Priority
  priority?: "low" | "medium" | "high" | "urgent";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SendNotificationRequest = await request.json();

    // Validate required fields
    if (!body.type) {
      return NextResponse.json(
        { error: "Notification type is required" },
        { status: 400 },
      );
    }

    if (!body.channels || body.channels.length === 0) {
      return NextResponse.json(
        { error: "At least one channel is required" },
        { status: 400 },
      );
    }

    // Get target users based on filters
    let targetUsers: any[] = [];

    if (body.userIds && body.userIds.length > 0) {
      // Send to specific user IDs
      targetUsers = await prisma.user.findMany({
        where: {
          id: { in: body.userIds },
          status: "ACTIVE",
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          companyId: true,
        },
      });
    } else {
      // Build query based on filters
      const whereClause: any = {
        status: "ACTIVE",
      };

      // Filter by company if specified
      if (body.companyId) {
        whereClause.companyId = body.companyId;
      }

      // Filter by roles if specified
      if (body.role && body.role.length > 0) {
        whereClause.role = { in: body.role };
      }

      // Get all users matching criteria
      targetUsers = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          companyId: true,
        },
      });
    }

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: "No users found matching the criteria" },
        { status: 404 },
      );
    }

    // Prepare notification data
    const notificationData = body.data || {};

    // Add custom title and message if provided
    const customTitle = body.title || "Notification";
    const customMessage = body.message || "";

    // Send notifications to all target users
    const results = await Promise.allSettled(
      targetUsers.map(async (user) => {
        // Prepare user-specific data
        const userData: Record<string, any> = {
          ...notificationData,
          userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          companyId: user.companyId,
        };

        // Add custom message variables if provided
        if (body.title) {
          userData.notificationTitle = customTitle;
        }
        if (body.message) {
          userData.notificationMessage = customMessage;
        }

        // Send notification
        const result = await notificationManager.sendNotification({
          userId: user.id,
          type: body.type,
          data: userData,
          channels: body.channels,
          priority: body.priority,
        });

        return {
          userId: user.id,
          userName: userData.userName,
          success: result.success,
          notificationId: result.notificationId,
          errors: result.errors,
        };
      }),
    );

    // Process results
    const processedResults = results.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          userId: "unknown",
          success: false,
          errors: [result.reason?.message || "Unknown error"],
        };
      }
    });

    const successCount = processedResults.filter((r) => r.success).length;
    const failureCount = processedResults.filter((r) => !r.success).length;

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATED",
          entity: "BULK_NOTIFICATION",
          entityId: `bulk_${Date.now()}`,
          meta: {
            type: body.type,
            channels: body.channels,
            recipientCount: targetUsers.length,
            successCount,
            failureCount,
            filters: {
              role: body.role,
              companyId: body.companyId,
              userCount: body.userIds?.length,
            },
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: targetUsers.length,
        success: successCount,
        failed: failureCount,
      },
      results: processedResults,
    });
  } catch (error) {
    console.error("Error sending bulk notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET - Return available options for the notification form
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    // Get user count by role for statistics
    const userStats = await prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
      where: {
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      companies,
      userStats: userStats.reduce(
        (acc, stat) => {
          acc[stat.role] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      notificationTypes: [
        { value: "admin_manual", label: "Admin Manual" },
        { value: "staff_manual", label: "Staff Manual" },
        { value: "system_alert", label: "System Alert" },
        { value: "promotional", label: "Promotional" },
        { value: "protection", label: "Security Alert" },
      ],
      roles: [
        { value: "ADMIN", label: "Admin" },
        { value: "MANAGER", label: "Manager" },
        { value: "ACCOUNTANT", label: "Accountant" },
        { value: "STAFF", label: "Staff" },
      ],
      channels: [
        { value: "in_app", label: "In-App" },
        { value: "email", label: "Email" },
        { value: "whatsapp", label: "WhatsApp" },
        { value: "push", label: "Push Notification" },
      ],
      priorities: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "urgent", label: "Urgent" },
      ],
    });
  } catch (error) {
    console.error("Error fetching notification options:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
