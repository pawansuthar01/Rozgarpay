// ============================================
// Database-Backed Notification Storage
// Uses the existing Prisma Notification model
// ============================================

import { prisma } from "@/lib/prisma";
import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from "./types";

export class NotificationStorage {
  /**
   * Create a new notification record
   */
  async createNotification(data: {
    userId: string;
    companyId: string;
    type: string;
    title: string;
    message: string;
    channel: string;
    meta?: Record<string, any>;
  }): Promise<{ id: string }> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        title: data.title,
        message: data.message,
        channel: (data.channel || "in_app").toUpperCase() as any,
        meta: data.meta
          ? { ...data.meta, type: data.type }
          : { type: data.type },
      },
    });

    return { id: notification.id };
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string) {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) return null;

    return {
      id: notification.id,
      userId: notification.userId,
      companyId: notification.companyId,
      type:
        ((notification.meta as Record<string, any>)
          ?.type as NotificationType) || "system_alert",
      title: notification.title,
      message: notification.message,
      channel: notification.channel
        .toLowerCase()
        .replace("_", "") as NotificationChannel,
      status: notification.status.toLowerCase() as NotificationStatus,
      data: (notification.meta as Record<string, any>)?.data as
        | Record<string, any>
        | undefined,
      createdAt: notification.createdAt,
    };
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: options.limit || 50,
      skip: options.offset || 0,
    });

    return notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      companyId: n.companyId,
      type:
        ((n.meta as Record<string, any>)?.type as NotificationType) ||
        "system_alert",
      title: n.title,
      message: n.message,
      channel: n.channel.toLowerCase().replace("_", "") as NotificationChannel,
      status: n.status.toLowerCase() as NotificationStatus,
      data: (n.meta as Record<string, any>)?.data as
        | Record<string, any>
        | undefined,
      createdAt: n.createdAt,
    }));
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, status: "PENDING" },
    });
  }

  /**
   * Get notification statistics - simplified version
   */
  async getStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, pending, sent, failed] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, status: "PENDING" } }),
      prisma.notification.count({ where: { ...where, status: "SENT" } }),
      prisma.notification.count({ where: { ...where, status: "FAILED" } }),
    ]);

    return {
      total,
      unread: pending,
      sent,
      failed,
      byType: {} as Record<string, number>,
      byChannel: {} as Record<string, number>,
    };
  }

  // ============================================
  // Notification Log Operations
  // ============================================

  /**
   * Log a notification send attempt
   */
  async logNotification(data: {
    type: string;
    channel: string;
    recipient: string;
    status: "sent" | "failed" | "pending";
    errorMessage?: string;
    provider: string;
    messageId?: string;
    cost?: number;
    metadata?: Record<string, any>;
    sentAt?: Date;
  }) {
    try {
      const log = await prisma.notificationLog.create({
        data: {
          type: data.type,
          channel: data.channel,
          recipient: data.recipient,
          status: data.status,
          errorMessage: data.errorMessage,
          provider: data.provider,
          messageId: data.messageId,
          cost: data.cost,
          metadata: data.metadata || undefined,
          sentAt: data.sentAt,
        },
      });

      return log;
    } catch (_) {}
  }

  /**
   * Get notification logs with filters
   */
  async getNotificationLogs(options: {
    type?: string;
    channel?: string;
    status?: string;
    recipient?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (options.type) where.type = options.type;
    if (options.channel) where.channel = options.channel;
    if (options.status) where.status = options.status;
    if (options.recipient) {
      where.recipient = { contains: options.recipient, mode: "insensitive" };
    }

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    return { logs, total };
  }
}

// Export singleton instance
export const notificationStorage = new NotificationStorage();
