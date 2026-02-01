import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notificationManager } from "@/lib/notifications/manager";
import {
  getTemplate,
  NOTIFICATION_TEMPLATES,
} from "@/lib/notifications/templates";
import { NotificationType } from "@/lib/notifications/types";

// Rate limit configuration (from OTP service)
const RATE_LIMIT_CONFIG = {
  MAX_PER_HOUR: 3,
  MAX_PER_DAY: 10,
  COOLDOWN_SECONDS: 60,
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let {
      notificationId,
      notificationData,
      useTemplate, // If true, use template data
      templateType, // Template type to use
      customData, // Custom data to override template
    } = body;

    // Handle resend of failed notification
    if (notificationId && !useTemplate) {
      if (!notificationData) {
        notificationData = await prisma.notificationLog.findUnique({
          where: { id: notificationId },
        });
      }

      if (!notificationData) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 },
        );
      }

      const { metadata, recipient, channel } = notificationData;

      // Try to resend the notification
      try {
        if (channel === "email") {
          await notificationManager.sendExternalInvitation(
            recipient,
            "",
            ["email"],
            {
              type: metadata.template,
              role: metadata.role,
              companyName: metadata.companyName,
              staffName: metadata.staffName,
              token: metadata.invitationUrl || "",
              expiresAt: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              message: metadata.message,
            },
          );
        } else if (channel === "whatsapp") {
          await notificationManager.sendExternalInvitation(
            "",
            recipient,
            ["whatsapp"],
            {
              type: metadata.template,
              role: metadata.role,
              companyName: metadata.companyName,
              staffName: metadata.staffName,
              token: metadata.invitationUrl || "",
              expiresAt: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              message: metadata.message,
            },
          );
        }

        const updatedNotification = await prisma.notificationLog.update({
          where: { id: notificationId },
          data: {
            status: "sent",
            sentAt: new Date(),
            errorMessage: null,
          },
        });

        return NextResponse.json({
          success: true,
          notification: updatedNotification,
          message: "Notification resent successfully",
        });
      } catch (resendError) {
        const errorMessage =
          resendError instanceof Error ? resendError.message : "Unknown error";
        await prisma.notificationLog.update({
          where: { id: notificationId },
          data: {
            errorMessage: `Retry failed: ${errorMessage}`,
          },
        });

        return NextResponse.json(
          {
            error: "Failed to resend notification",
            details: errorMessage,
          },
          { status: 500 },
        );
      }
    }

    // Send new notification using template
    if (useTemplate && templateType) {
      const template = getTemplate(templateType as NotificationType);

      if (!template) {
        return NextResponse.json(
          { error: `Template '${templateType}' not found` },
          { status: 400 },
        );
      }

      const { recipients, channels, subject, message } = customData || {};

      if (!recipients || recipients.length === 0) {
        return NextResponse.json(
          { error: "Recipients are required" },
          { status: 400 },
        );
      }

      // Interpolate template with custom data
      const interpolate = (text: string, data: Record<string, any>) => {
        return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
          return data[key] !== undefined ? String(data[key]) : _match;
        });
      };

      const templateData = {
        ...customData,
        ...template.variables.reduce(
          (acc, v) => {
            acc[v] = `{{${v}}}`; // Keep placeholders if not provided
            return acc;
          },
          {} as Record<string, string>,
        ),
      };

      const finalTitle = subject || interpolate(template.title, templateData);
      const finalMessage =
        message || interpolate(template.message, templateData);

      const results = [];

      for (const recipient of recipients) {
        const isEmail = recipient.includes("@");
        const targetChannels = channels || template.channels;

        try {
          const result = await notificationManager.sendExternalNotification({
            email: isEmail ? recipient : undefined,
            phone: !isEmail ? recipient : undefined,
            channels: targetChannels as any,
            title: finalTitle,
            message: finalMessage,
            type: templateType as NotificationType,
            data: {
              ...templateData,
              templateName: template.id,
            },
          });

          results.push({
            recipient,
            success: result.success,
            notificationId: result.notificationId,
            errors: result.errors,
          });
        } catch (err) {
          results.push({
            recipient,
            success: false,
            errors: [err instanceof Error ? err.message : "Unknown error"],
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;

      return NextResponse.json({
        success: successCount > 0,
        message: `Sent ${successCount}/${recipients.length} notifications`,
        results,
        templateUsed: {
          type: templateType,
          title: finalTitle,
          message: finalMessage,
        },
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid request. Provide notificationId to resend or useTemplate=true to send new.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause for notification logs
    const where: any = {};

    if (search) {
      where.OR = [
        { type: { contains: search, mode: "insensitive" } },
        { recipient: { contains: search, mode: "insensitive" } },
        { provider: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (channel && channel !== "ALL") {
      where.channel = channel;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    // Fetch notification logs
    const [notifications, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    // Get counts by type
    const typeCounts = await prisma.notificationLog.groupBy({
      by: ["type"],
      _count: { id: true },
    });

    // Get counts by channel
    const channelCounts = await prisma.notificationLog.groupBy({
      by: ["channel"],
      _count: { id: true },
    });

    // Get counts by status
    const statusCounts = await prisma.notificationLog.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // Get counts by provider (MSG91, Resend, etc.)
    const providerCounts = await prisma.notificationLog.groupBy({
      by: ["provider"],
      _count: { id: true },
    });

    // Get cost by provider
    const costByProvider = await prisma.notificationLog.groupBy({
      by: ["provider"],
      _sum: { cost: true },
      where: {
        cost: { not: null },
      },
    });

    // Calculate rate limit usage (from OTP logs)
    const now = Date.now();
    const hourWindow = 60 * 60 * 1000;
    const dayWindow = 24 * 60 * 60 * 1000;

    // Get all unique identifiers (phone/email) from recent OTPs
    const recentOTPs = await prisma.otp.findMany({
      where: {
        createdAt: {
          gte: new Date(now - dayWindow),
        },
      },
      select: {
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    // Count unique identifiers that hit hourly limit
    const hourlyLimitHits = new Set<string>();
    const dailyLimitHits = new Set<string>();

    recentOTPs.forEach((otp) => {
      if (otp.phone) {
        // Check hourly
        const hourlyCount = recentOTPs.filter(
          (o) =>
            o.phone === otp.phone && o.createdAt.getTime() > now - hourWindow,
        ).length;
        if (hourlyCount >= RATE_LIMIT_CONFIG.MAX_PER_HOUR) {
          hourlyLimitHits.add(`phone:${otp.phone}`);
        }

        // Check daily
        const dailyCount = recentOTPs.filter(
          (o) => o.phone === otp.phone,
        ).length;
        if (dailyCount >= RATE_LIMIT_CONFIG.MAX_PER_DAY) {
          dailyLimitHits.add(`phone:${otp.phone}`);
        }
      }

      if (otp.email) {
        const hourlyCount = recentOTPs.filter(
          (o) =>
            o.email === otp.email && o.createdAt.getTime() > now - hourWindow,
        ).length;
        if (hourlyCount >= RATE_LIMIT_CONFIG.MAX_PER_HOUR) {
          hourlyLimitHits.add(`email:${otp.email}`);
        }

        const dailyCount = recentOTPs.filter(
          (o) => o.email === otp.email,
        ).length;
        if (dailyCount >= RATE_LIMIT_CONFIG.MAX_PER_DAY) {
          dailyLimitHits.add(`email:${otp.email}`);
        }
      }
    });

    // Get total notifications by type for all types
    const allNotificationTypes = Object.keys(NOTIFICATION_TEMPLATES);
    const allTypeStats = await Promise.all(
      allNotificationTypes.map(async (type) => {
        const count = await prisma.notificationLog.count({
          where: { type },
        });
        return { type, count };
      }),
    );

    // Get today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayStats = await prisma.notificationLog.groupBy({
      by: ["status"],
      _count: { id: true },
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      // Pagination
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      // Counts by type
      typeCounts: typeCounts.reduce(
        (acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      // Counts by channel
      channelCounts: channelCounts.reduce(
        (acc, item) => {
          acc[item.channel] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      // Counts by status
      statusCounts: statusCounts.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      // Counts by provider
      providerCounts: providerCounts.reduce(
        (acc, item) => {
          acc[item.provider || "unknown"] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      // Cost by provider
      costByProvider: costByProvider.reduce(
        (acc, item) => {
          acc[item.provider || "unknown"] = item._sum.cost || 0;
          return acc;
        },
        {} as Record<string, number>,
      ),
      // All notification types with counts
      allNotificationTypes: allTypeStats,
      // Rate limit stats
      rateLimit: {
        config: RATE_LIMIT_CONFIG,
        hourlyLimitHits: hourlyLimitHits.size,
        dailyLimitHits: dailyLimitHits.size,
        recentOTPCount: recentOTPs.length,
        uniqueIdentifiers: new Set([
          ...recentOTPs.map((o) => o.phone).filter(Boolean),
          ...recentOTPs.map((o) => o.email).filter(Boolean),
        ]).size,
      },
      // Today's stats
      todayStats: todayStats.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      // Available templates
      templates: Object.entries(NOTIFICATION_TEMPLATES).map(
        ([key, template]) => ({
          type: key,
          title: template.title,
          message: template.message,
          channels: template.channels,
          variables: template.variables,
        }),
      ),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
