// ============================================
// Production-Ready Notification Manager
// Combines storage, queue, idempotency, and providers
// ============================================

import { prisma } from "@/lib/prisma";
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  SendNotificationRequest,
  SendNotificationResponse,
} from "./types";
import { NOTIFICATION_TEMPLATES, getTemplate } from "./templates";
import { notificationStorage } from "./storage";
import { idempotencyService, IdempotencyResult } from "./idempotency";
import { notificationQueue } from "./queue";
import { emailProvider, whatsappProvider } from "./providers";

// Interpolate template variables
function interpolate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return data[key] !== undefined ? String(data[key]) : _match;
  });
}

export class NotificationManager {
  /**
   * Send a notification (fire-and-forget for async channels)
   */
  async sendNotification(
    request: SendNotificationRequest,
  ): Promise<SendNotificationResponse> {
    const {
      userId,
      type,
      data = {},
      channels,
      priority,
      idempotencyKey,
    } = request;

    // 1. Check idempotency
    if (idempotencyKey) {
      const idempotencyCheck = await idempotencyService.check(idempotencyKey);
      if (idempotencyCheck.isDuplicate) {
        return {
          success: true,
          notificationId: idempotencyCheck.existingNotificationId,
        };
      }
    }

    // 2. Get template
    const template = getTemplate(type);
    if (!template) {
      return { success: false, errors: ["Notification template not found"] };
    }

    // 3. Get admin settings
    const adminSettings = await this.getAdminSettings(type);
    if (!adminSettings.enabled) {
      return {
        success: false,
        errors: ["Notification type disabled by admin"],
      };
    }

    // 4. Get user and company info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, firstName: true, lastName: true },
    });

    if (!user) {
      return { success: false, errors: ["User not found"] };
    }

    // 5. Prepare notification content
    const userData = {
      ...data,
      userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    };

    const title = interpolate(template.title, userData);
    const message = interpolate(template.message, userData);

    // 6. Determine channels
    const allowedChannels = (channels || template.channels).filter(
      (c) => adminSettings.channels[c],
    );

    if (allowedChannels.length === 0) {
      return { success: false, errors: ["No channels available"] };
    }

    // 7. Create notification record
    const { id: notificationId } = await notificationStorage.createNotification(
      {
        userId,
        companyId: user.companyId || "",
        type,
        title,
        message,
        channel: "in_app",
        meta: { priority, channels: allowedChannels, data: userData },
      },
    );

    // 8. Record idempotency key
    if (idempotencyKey) {
      await idempotencyService.record(idempotencyKey, notificationId);
    }

    // 9. Queue async channels (email, whatsapp)
    const asyncChannels = allowedChannels.filter(
      (c) => c === "email" || c === "whatsapp",
    );

    for (const channel of asyncChannels) {
      await notificationQueue.enqueue(notificationId, channel);
    }

    // 10. Handle in-app notification synchronously
    if (
      allowedChannels.includes("in_app") ||
      allowedChannels.includes("push")
    ) {
      // In-app notifications are already stored
      console.log(
        `[NOTIFICATION] In-app notification created: ${notificationId}`,
      );
    }

    return {
      success: true,
      notificationId,
      queued: asyncChannels.length > 0,
    };
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    return notificationStorage.getUserNotifications(userId, options);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    // Verify ownership and update
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) return false;

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "SENT" },
    });

    return true;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, status: "PENDING" },
      data: { status: "SENT" },
    });

    return result.count;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return notificationStorage.getUnreadCount(userId);
  }

  /**
   * Get notification statistics
   */
  async getStats(userId?: string) {
    return notificationStorage.getStats(userId);
  }

  /**
   * Get notification logs for admin
   */
  async getLogs(options: {
    type?: string;
    channel?: string;
    status?: string;
    recipient?: string;
    limit?: number;
    offset?: number;
  }) {
    return notificationStorage.getNotificationLogs(options);
  }

  /**
   * Get admin settings for a notification type
   */
  private async getAdminSettings(type: NotificationType): Promise<{
    enabled: boolean;
    channels: Record<NotificationChannel, boolean>;
  }> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: {
          category_key: {
            category: "notifications",
            key: type,
          },
        },
      });

      if (setting) {
        const data = JSON.parse(setting.value);
        return {
          enabled: data.enabled !== false,
          channels: data.channels || {},
        };
      }

      // Fallback to template defaults
      const template = getTemplate(type);
      if (!template) {
        return {
          enabled: false,
          channels: {} as Record<NotificationChannel, boolean>,
        };
      }

      const channels: Record<NotificationChannel, boolean> = {} as Record<
        NotificationChannel,
        boolean
      >;
      template.channels.forEach((c) => {
        channels[c] = true;
      });

      return { enabled: true, channels };
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      return {
        enabled: true,
        channels: { in_app: true, push: true, email: false, whatsapp: false },
      };
    }
  }

  /**
   * Send bulk notifications (for super-admin)
   */
  async sendBulkNotification(request: {
    type: NotificationType;
    title?: string;
    message?: string;
    channels: NotificationChannel[];
    priority?: NotificationPriority;
    filters: {
      roles?: string[];
      companyId?: string;
      userIds?: string[];
    };
    idempotencyKey?: string;
  }): Promise<{ success: boolean; batchId: string; queuedCount: number }> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check idempotency for bulk
    if (request.idempotencyKey) {
      const check = await idempotencyService.check(
        `${batchId}_${request.idempotencyKey}`,
      );
      if (check.isDuplicate) {
        return { success: true, batchId, queuedCount: 0 };
      }
    }

    // Build user query
    const where: any = { status: "ACTIVE" };

    if (request.filters.companyId) {
      where.companyId = request.filters.companyId;
    }

    if (request.filters.roles && request.filters.roles.length > 0) {
      where.role = { in: request.filters.roles };
    }

    if (request.filters.userIds && request.filters.userIds.length > 0) {
      where.id = { in: request.filters.userIds };
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, companyId: true, firstName: true, lastName: true },
    });

    if (users.length === 0) {
      return { success: false, batchId, queuedCount: 0 };
    }

    // Create notifications for each user
    let queuedCount = 0;

    for (const user of users) {
      const userData = {
        userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        companyId: user.companyId,
      };

      const title =
        request.title ||
        interpolate(getTemplate(request.type)!.title, userData);
      const message =
        request.message ||
        interpolate(getTemplate(request.type)!.message, userData);

      const { id: notificationId } =
        await notificationStorage.createNotification({
          userId: user.id,
          companyId: user.companyId || "",
          type: request.type,
          title,
          message,
          channel: "in_app",
          meta: {
            priority: request.priority,
            channels: request.channels.join(","),
          },
        });

      // Queue async channels
      for (const channel of request.channels) {
        if (channel === "email" || channel === "whatsapp") {
          await notificationQueue.enqueue(notificationId, channel);
          queuedCount++;
        }
      }
    }

    // Record idempotency
    if (request.idempotencyKey) {
      await idempotencyService.record(
        `${batchId}_${request.idempotencyKey}`,
        batchId,
      );
    }

    return { success: true, batchId, queuedCount };
  }

  /**
   * Send external invitation notification (for non-users)
   */
  async sendExternalInvitation(
    email: string,
    phone: string,
    channels: NotificationChannel[],
    data: {
      type: NotificationType;
      role: string;
      companyName: string;
      staffName?: string;
      token: string;
      expiresAt: string;
      message?: string;
    },
  ): Promise<{ success: boolean; notificationId?: string; errors?: string[] }> {
    const { type, staffName, companyName, token, expiresAt, message } = data;

    // Build the notification title and message
    const title = `You're Invited to Join RozgarPay`;
    const notificationMessage =
      message ||
      `Your company "${companyName}" has been registered successfully. Join now!`;

    // For external invitations, use sendExternalNotification directly
    // This bypasses the database notification table (which requires valid userId)
    return this.sendExternalNotification({
      email,
      phone,
      channels,
      title,
      data: {
        staffName,
        companyName,
        token,
      },
      message: notificationMessage,
      type: type as NotificationType,
    });
  }

  /**
   * Send notification to company admins (fire-and-forget)
   */
  sendAdminNotification(
    companyId: string,
    type: NotificationType,
    data: {
      subject?: string;
      message?: string;
      adminName?: string;
      companyName?: string;
      staffName?: string;
    },
  ): void {
    // Get all admins for the company
    prisma.user
      .findMany({
        where: {
          companyId,
          role: { in: ["ADMIN", "MANAGER"] },
          status: "ACTIVE",
        },
        select: { id: true, firstName: true, lastName: true },
      })
      .then((admins) => {
        if (admins.length === 0) return;

        const template = getTemplate(type);
        const title = data.subject || template?.title || "Notification";
        const message = data.message || template?.message || "";

        // Process each admin
        for (const admin of admins) {
          notificationStorage
            .createNotification({
              userId: admin.id,
              companyId,
              type,
              title,
              message,
              channel: "in_app",
              meta: { data },
            })
            .then(({ id: notificationId }) => {
              // Queue async channels
              notificationQueue
                .enqueue(notificationId, "email")
                .catch(() => {});
              notificationQueue
                .enqueue(notificationId, "whatsapp")
                .catch(() => {});
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }

  /**
   * Subscribe user to notifications
   */
  async subscribeUser(request: {
    userId: string;
    userType: string;
    types: string[];
    channels: string[];
    preferences: {
      soundEnabled: boolean;
      vibrationEnabled: boolean;
      showPreview: boolean;
    };
  }): Promise<void> {
    // Log subscription - in a real implementation, this would store to a subscription table
    console.log(
      `[NOTIFICATION] User ${request.userId} subscribed: ${JSON.stringify(request)}`,
    );
  }

  /**
   * Send notification to external email/phone (not registered users)
   * Works for any email or phone number - even if not registered
   */
  async sendExternalNotification(request: {
    email?: string;
    phone?: string;
    channels: NotificationChannel[];
    title: string;
    message: string;
    type?: NotificationType;
    data?: {
      staffName?: string;
      companyName: string;
      token: string;
      actionUrl?: string;
    };
  }): Promise<{
    success: boolean;
    notificationId?: string;
    errors?: string[];
  }> {
    const {
      email,
      phone,
      channels,
      title,
      data,
      message,
      type = "system_alert",
    } = request;

    if (!phone && !email) {
      return { success: false, errors: ["Email or phone is required"] };
    }

    // External notification - no DB record, generate unique ID for logging
    const externalId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errors: string[] = [];

    // Send via email
    if (channels.includes("email") && email) {
      try {
        const success = await emailProvider.send({
          id: externalId,
          userId: "",
          title,
          message,

          data: { email, phone, ...data, title, message },
          type,
        });

        if (!success) {
          errors.push(`Failed to send email to ${email}`);
        }

        // Log the notification
        await notificationStorage.logNotification({
          type,
          channel: "email",
          recipient: email,
          status: success ? "sent" : "failed",
          provider: "Resend",
          metadata: { title, message, external: true, ...data },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Email error: ${errorMsg}`);
        console.error(`[EXTERNAL NOTIF] Email error to ${email}:`, err);
      }
    }

    // Send via WhatsApp
    if (channels.includes("whatsapp") && phone) {
      try {
        const success = await whatsappProvider.send({
          id: externalId,
          userId: "",
          title,
          message,
          data: { email, phone, ...data, title, message },
          type,
        });
        if (!success) {
          errors.push(`Failed to send WhatsApp to ${phone}`);
        }

        // Log the notification
        await notificationStorage.logNotification({
          type,
          channel: "whatsapp",
          recipient: phone,
          status: success ? "sent" : "failed",
          provider: "MSG91",
          metadata: { title, message, external: true, ...data },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`WhatsApp error: ${errorMsg}`);
        console.error(`[EXTERNAL NOTIF] WhatsApp error to ${phone}:`, err);
      }
    }

    return {
      success: errors.length === 0,
      notificationId: externalId,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();

// Export utility functions
export { interpolate };
