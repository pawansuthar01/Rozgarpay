// Real-Time Notification System
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export type NotificationType =
  | "customer_support"
  | "promotional"
  | "system_alert"
  | "admin_manual"
  | "staff_manual"
  | "invitation_company"
  | "invitation_staff";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export type NotificationChannel = "in_app" | "push" | "email" | "whatsapp";

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  variables: string[]; // Template variables like {{orderId}}, {{customerName}}
  actions?: Array<{
    label: string;
    action: string;
    params: Record<string, any>;
  }>;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  data?: Record<string, any>; // Additional context data
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
  actions?: Array<{
    label: string;
    action: string;
    params: Record<string, any>;
  }>;
}

export interface NotificationSubscription {
  id?: string;
  userId: string;
  userType:
    | "staff"
    | "admin"
    | "super_admin"
    | "admin"
    | "manager"
    | "accountant";
  types: NotificationType[];
  channels: NotificationChannel[];
  preferences: {
    quietHours?: { start: string; end: string };
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    showPreview: boolean;
  };
  deviceTokens?: {
    fcm?: string; // Firebase Cloud Messaging
    apns?: string; // Apple Push Notification Service
    web?: string; // Web Push
  };
}

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  recipients: Array<{
    userId: string;
    userType:
      | "staff"
      | "admin"
      | "super_admin"
      | "admin"
      | "manager"
      | "accountant";
    channels: NotificationChannel[];
  }>;
  data: Record<string, any>;
  priority: NotificationPriority;
  scheduledFor?: Date;
  createdAt: Date;
}

// Notification Templates
export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  NotificationTemplate
> = {
  customer_support: {
    id: "customer_support",
    type: "customer_support",
    title: "Customer Support",
    message: "{{message}}",
    priority: "high",
    channels: ["in_app", "push"],
    variables: ["message", "supportId"],
    actions: [
      {
        label: "Contact Support",
        action: "navigate",
        params: { route: "/support" },
      },
    ],
  },
  promotional: {
    id: "promotional",
    type: "promotional",
    title: "{{title}}",
    message: "{{message}}",
    priority: "low",
    channels: ["in_app", "push"],
    variables: ["title", "message", "offerId"],
    actions: [
      {
        label: "View Offer",
        action: "navigate",
        params: { route: "/offers/{{offerId}}" },
      },
    ],
  },
  system_alert: {
    id: "system_alert",
    type: "system_alert",
    title: "System Alert",
    message: "{{message}}",
    priority: "urgent",
    channels: ["in_app", "push", "email"],
    variables: ["message", "alertType"],
  },
  admin_manual: {
    id: "admin_manual",
    type: "admin_manual",
    title: "{{title}}",
    message: "{{message}}",
    priority: "medium",
    channels: ["in_app", "push"],
    variables: ["title", "message", "sentBy"],
    actions: [], // Will be set dynamically
  },
  staff_manual: {
    id: "store_manual",
    type: "staff_manual",
    title: "{{title}}",
    message: "{{message}}",
    priority: "medium",
    channels: ["in_app", "push"],
    variables: ["title", "message", "storeName", "sentBy"],
    actions: [], // Will be set dynamically
  },

  invitation_company: {
    id: "invitation",
    type: "invitation_company",
    title: "You're Invited to Join TownKart",
    message:
      "You've been invited to join RozgarPay as a {{role}}. Click here to complete your registration.",
    priority: "high",
    channels: ["in_app", "email", "whatsapp"], // Support all channels for invitations
    variables: ["role", "invitationUrl", "expiresAt", "message"],
    actions: [
      {
        label: "Accept Invitation",
        action: "navigate",
        params: { route: "{{invitationUrl}}" },
      },
    ],
  },
  invitation_staff: {
    id: "invitation",
    type: "invitation_staff",
    title: "You're Invited to Join TownKart",
    message:
      "You've been invited to join RozgarPay as a {{role}}. Click here to complete your registration.",
    priority: "high",
    channels: ["in_app", "email", "whatsapp"], // Support all channels for invitations
    variables: ["role", "invitationUrl", "expiresAt", "message"],
    actions: [
      {
        label: "Accept Invitation",
        action: "navigate",
        params: { route: "{{invitationUrl}}" },
      },
    ],
  },
};

// Notification Manager Class
export class NotificationManager {
  private notifications: Map<string, Notification[]> = new Map();
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private eventListeners: Map<
    string,
    Array<(event: NotificationEvent) => void>
  > = new Map();

  // Send notification
  async sendNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, any>,
    channels?: NotificationChannel[],
  ): Promise<{ success: boolean; notificationId?: string; errors?: string[] }> {
    try {
      const subscription = this.subscriptions.get(userId);
      if (!subscription) {
        return {
          success: false,
          errors: ["User not subscribed to notifications"],
        };
      }

      // Check if user wants this type of notification
      if (!subscription.types.includes(type)) {
        return {
          success: false,
          errors: ["User has disabled this notification type"],
        };
      }

      // Check admin settings for notification type
      const adminSettings = await this.getAdminNotificationSettings(type);
      if (!adminSettings.enabled) {
        return {
          success: false,
          errors: ["Notification type disabled by admin"],
        };
      }

      // Check quiet hours
      if (this.isQuietHour(subscription)) {
        return {
          success: false,
          errors: ["Notification blocked by quiet hours"],
        };
      }

      // Get template
      const template = NOTIFICATION_TEMPLATES[type];
      if (!template) {
        return { success: false, errors: ["Notification template not found"] };
      }

      // Interpolate template
      const title = this.interpolate(template.title, data);
      const message = this.interpolate(template.message, data);
      const actions = template.actions?.map((action) => ({
        ...action,
        params: this.interpolateObject(action.params, data),
      }));

      // Filter channels based on admin settings
      let allowedChannels = channels || subscription.channels;
      allowedChannels = allowedChannels.filter(
        (channel) => adminSettings.channels[channel],
      );

      // Create notification
      const notification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        title,
        message,
        priority: template.priority,
        channels: allowedChannels,
        data,
        read: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        actions,
      };

      // Store notification
      const userNotifications = this.notifications.get(userId) || [];
      this.notifications.set(userId, [notification, ...userNotifications]);

      // Send through channels
      const sendResults = await this.sendThroughChannels(
        notification,
        subscription,
      );

      return {
        success: true,
        notificationId: notification.id,
        errors: sendResults
          .filter((r) => !r.success)
          .map((r) => r.error || "Unknown error"),
      };
    } catch (error) {
      console.error("Error sending notification:", error);
      return { success: false, errors: ["Internal error"] };
    }
  }

  // Send external notifications directly (for invitations to non-registered users)
  async sendExternalInvitation(
    email: string,
    phone: string | null,
    channels: ("email" | "whatsapp" | "sms")[],
    invitationData: {
      type: NotificationType;
      role: string;
      companyName: string;
      staffName?: string;
      invitationUrl: string;
      expiresAt: string;
      message?: string;
    },
  ): Promise<{ channel: string; success: boolean; error?: string }[]> {
    const results: { channel: string; success: boolean; error?: string }[] = [];
    const roleDisplay =
      invitationData.role === "ADMIN" ? "Company Owner" : "staff";

    // Send email
    if (channels.includes("email")) {
      const startTime = Date.now();
      let messageId: string | undefined;
      let errorMessage: string | undefined;

      try {
        const emailSubject = `Invitation to join company ${invitationData.companyName} as ${roleDisplay}`;
        const emailMessage = `You've been invited to join ${invitationData.companyName} as a ${roleDisplay.toLowerCase()}.

${invitationData.message ? `Message: ${invitationData.message}` : ""}

This invitation expires on ${invitationData.expiresAt}.`;

        const emailSent = await this.sendExternalEmail(
          email,
          emailSubject,
          emailMessage,
          undefined,
          [{ label: "Accept Invitation", url: invitationData.invitationUrl }],
        );

        if (emailSent) {
          results.push({ channel: "email", success: true });
        } else {
          errorMessage = "Email service unavailable or domain not verified";
          results.push({
            channel: "email",
            success: false,
            error: errorMessage,
          });
        }
      } catch (error: any) {
        errorMessage = error.message;
        results.push({
          channel: "email",
          success: false,
          error: errorMessage,
        });
      }

      // Log to database
      await this.logNotification({
        type: "invitation",
        channel: "email",
        recipient: email,
        status: results[results.length - 1].success ? "sent" : "failed",
        errorMessage,
        provider: "Resend",
        messageId,
        sentAt: results[results.length - 1].success ? new Date() : undefined,
        metadata: {
          role: invitationData.role,
          invitationUrl: invitationData.invitationUrl,
          processingTime: Date.now() - startTime,
        },
      });
    }

    // Send WhatsApp
    if (channels.includes("whatsapp") && phone) {
      const startTime = Date.now();
      let messageId: string | undefined;
      let errorMessage: string | undefined;

      try {
        const whatsappNotification = {
          id: `invitation_external_${Date.now()}`,
          userId: "system",
          type: invitationData.type as NotificationType,
          title: `You're Invited to Join ${invitationData.companyName}`,
          message: `You've been invited to join ${invitationData.companyName} as a ${roleDisplay.toLowerCase()}. Click here to complete your registration.`,
          priority: "high" as const,
          channels: ["whatsapp"] as NotificationChannel[],
          data: {
            ...invitationData,
            phone,
          },
          read: false,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };

        await this.sendWhatsApp(whatsappNotification);
        results.push({ channel: "whatsapp", success: true });
      } catch (error: any) {
        errorMessage = error.message;
        results.push({
          channel: "whatsapp",
          success: false,
          error: errorMessage,
        });
      }

      // Log to database
      await this.logNotification({
        type: "invitation",
        channel: "whatsapp",
        recipient: phone,
        status: results[results.length - 1].success ? "sent" : "failed",
        errorMessage,
        provider: "MSG91",
        messageId,
        sentAt: results[results.length - 1].success ? new Date() : undefined,
        metadata: {
          role: invitationData.role,
          invitationUrl: invitationData.invitationUrl,
          processingTime: Date.now() - startTime,
          template: this.getWhatsAppTemplateName(invitationData.type),
        },
      });
    }

    return results;
  }

  // Log notification to database
  private async logNotification(data: {
    type: string;
    channel: string;
    recipient: string;
    status: "sent" | "failed" | "pending";
    errorMessage?: string;
    provider?: string;
    messageId?: string;
    cost?: number;
    metadata?: any;
    sentAt?: Date;
  }): Promise<void> {
    try {
      // Use type assertion for now until Prisma client is regenerated
      await prisma.notificationLog.create({
        data: {
          type: data.type,
          channel: data.channel,
          recipient: data.recipient,
          status: data.status,
          errorMessage: data.errorMessage,
          provider: data.provider,
          messageId: data.messageId,
          cost: data.cost,
          metadata: data.metadata,
          sentAt: data.sentAt,
        },
      });
    } catch (error) {
      console.error("Failed to log notification:", error);
      // Don't throw - logging failure shouldn't break notification sending
    }
  }

  // Send external email (for invitations, etc.) using Resend
  async sendExternalEmail(
    email: string,
    subject: string,
    message: string,
    html?: string,
    actions?: Array<{ label: string; url: string }>,
  ): Promise<boolean> {
    try {
      const resendApiKey = process.env.RESEND_API_KEY;

      if (!resendApiKey) {
        console.warn(
          "[EMAIL] RESEND_API_KEY not configured - email sending disabled",
        );
        console.warn("[EMAIL] To enable email notifications:");
        console.warn("[EMAIL] 1. Sign up at https://resend.com");
        console.warn("[EMAIL] 2. Add RESEND_API_KEY to your .env file");
        console.warn("[EMAIL] 3. Verify your domain in Resend dashboard");
        return false;
      }

      const resend = new Resend(resendApiKey);

      const htmlContent =
        html ||
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">TownKart</h1>
              <p style="color: #e8e8e8; margin: 10px 0 0 0;">Your trusted delivery partner</p>
            </div>

            <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #333; margin-top: 0; margin-bottom: 20px;">${subject}</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">${message}</p>

              ${
                actions
                  ?.map(
                    (action) => `
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${action.url}"
                     style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2); transition: all 0.3s ease;">
                    ${action.label}
                  </a>
                </div>
              `,
                  )
                  .join("") || ""
              }

              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
                <p>If you have any questions, feel free to contact our support team.</p>
                <p style="margin: 5px 0;">
                  <a href="mailto:support@rozgarpay.com" style="color: #667eea; text-decoration: none;">support@rozgarpay.com</a>
                </p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2025 Rozgarpay. All rights reserved.</p>
            </div>
          </body>
        </html>
      `;

      const fromEmail =
        process.env.RESEND_FROM_EMAIL || "noreply@rozgarpay.com";
      const fromName = process.env.RESEND_FROM_NAME || "rozgarpay";

      const data = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject: subject,
        html: htmlContent,
        text: `${subject}\n\n${message}`,
      });

      console.log("✅ Email sent successfully:", data);
      return true;
    } catch (error: any) {
      console.error("❌ Failed to send external email:", error);

      // Log specific error details for debugging
      if (error.message) {
        console.error("Error message:", error.message);
      }
      if (error.statusCode) {
        console.error("Status code:", error.statusCode);
      }

      // Provide helpful error messages for common issues
      if (error.statusCode === 403) {
        console.error("❌ DOMAIN VERIFICATION REQUIRED:");
        console.error("❌ The sending domain is not verified in Resend.");
        console.error("❌ To fix this:");
        console.error("❌ 1. Go to https://resend.com/domains");
        console.error("❌ 2. Add and verify your domain (townkart.com)");
        console.error("❌ 3. Or use a verified domain in RESEND_FROM_EMAIL");
        console.error(
          "❌ 4. For development, use: noreply@your-verified-domain.com",
        );
      } else if (error.statusCode === 401) {
        console.error("❌ INVALID API KEY:");
        console.error("❌ Check your RESEND_API_KEY in .env file");
      }

      return false;
    }
  }

  // Broadcast notification to multiple users
  async broadcastNotification(
    recipients: Array<{
      userId: string;
      userType: "customer" | "store_manager" | "rider" | "admin";
    }>,
    type: NotificationType,
    data: Record<string, any>,
    channels?: NotificationChannel[],
  ): Promise<{
    success: boolean;
    results: Array<{ userId: string; success: boolean; error?: string }>;
  }> {
    const results = await Promise.all(
      recipients.map(async (recipient) => {
        const result = await this.sendNotification(
          recipient.userId,
          type,
          data,
          channels,
        );
        return {
          userId: recipient.userId,
          success: result.success,
          error: result.errors?.[0],
        };
      }),
    );

    return {
      success: results.every((r) => r.success),
      results,
    };
  }

  // Get user notifications
  getUserNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean;
      type?: NotificationType;
      limit?: number;
      offset?: number;
    } = {},
  ): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];

    let filtered = userNotifications;

    if (options.unreadOnly) {
      filtered = filtered.filter((n) => !n.read);
    }

    if (options.type) {
      filtered = filtered.filter((n) => n.type === options.type);
    }

    // Remove expired notifications
    filtered = filtered.filter((n) => !n.expiresAt || n.expiresAt > new Date());

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (options.offset) {
      filtered = filtered.slice(options.offset);
    }
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  // Mark notification as read
  markAsRead(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find((n) => n.id === notificationId);
    if (!notification) return false;

    notification.read = true;
    notification.readAt = new Date();
    return true;
  }

  // Mark all notifications as read
  markAllAsRead(userId: string): number {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return 0;

    let count = 0;
    userNotifications.forEach((notification) => {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date();
        count++;
      }
    });

    return count;
  }

  // Subscribe user to notifications
  subscribeUser(subscription: NotificationSubscription): void {
    this.subscriptions.set(subscription.userId, subscription);
  }

  // Unsubscribe user
  unsubscribeUser(userId: string): void {
    this.subscriptions.delete(userId);
  }

  // Update subscription preferences
  updateSubscription(
    userId: string,
    updates: Partial<NotificationSubscription>,
  ): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return false;

    Object.assign(subscription, updates);
    return true;
  }

  // Get admin notification settings for a type
  private async getAdminNotificationSettings(type: NotificationType): Promise<{
    enabled: boolean;
    channels: Record<NotificationChannel, boolean>;
  }> {
    try {
      // Fetch from database
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
          enabled: data.enabled !== false, // Default to true if not set
          channels: data.channels || {},
        };
      }

      // Fallback to template defaults
      const template = NOTIFICATION_TEMPLATES[type];
      if (!template) {
        return {
          enabled: false,
          channels: {} as Record<NotificationChannel, boolean>,
        };
      }

      // Return template channels as enabled by default
      const channels: Record<NotificationChannel, boolean> = {} as Record<
        NotificationChannel,
        boolean
      >;
      template.channels.forEach((channel) => {
        channels[channel] = true;
      });

      return { enabled: true, channels };
    } catch (error) {
      console.error("Error fetching admin notification settings:", error);
      return {
        enabled: true,
        channels: {
          in_app: true,
          push: true,
          email: false,
          whatsapp: false,
        },
      };
    }
  }

  // Get notification statistics
  getNotificationStats(userId?: string): {
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  } {
    let notifications: Notification[] = [];

    if (userId) {
      notifications = this.notifications.get(userId) || [];
    } else {
      // Get all notifications
      const allNotifications: Notification[] = [];
      for (const userNotifs of Array.from(this.notifications.values())) {
        allNotifications.push(...userNotifs);
      }
      notifications = allNotifications;
    }

    const stats = {
      total: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      byType: {} as Record<NotificationType, number>,
      byPriority: {} as Record<NotificationPriority, number>,
    };

    notifications.forEach((notification) => {
      stats.byType[notification.type] =
        (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority] =
        (stats.byPriority[notification.priority] || 0) + 1;
    });

    return stats;
  }

  // Event system for real-time updates
  on(eventType: string, listener: (event: NotificationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  off(eventType: string, listener: (event: NotificationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }

  // Private methods
  private async sendThroughChannels(
    notification: Notification,
    subscription: NotificationSubscription,
  ): Promise<
    Array<{ channel: NotificationChannel; success: boolean; error?: string }>
  > {
    const results: Array<{
      channel: NotificationChannel;
      success: boolean;
      error?: string;
    }> = [];

    for (const channel of notification.channels) {
      if (!subscription.channels.includes(channel)) continue;

      try {
        switch (channel) {
          case "in_app":
            // Already stored, no additional action needed
            results.push({ channel, success: true });
            break;

          case "push":
            await this.sendPushNotification(notification, subscription);
            results.push({ channel, success: true });
            break;

          case "email":
            await this.sendEmail(notification);
            results.push({ channel, success: true });
            break;

          case "whatsapp":
            await this.sendWhatsApp(notification);
            results.push({ channel, success: true });
            break;
        }
      } catch (error: any) {
        console.error(`Failed to send ${channel} notification:`, error);
        results.push({ channel, success: false, error: error.message });
      }
    }

    return results;
  }

  private async sendPushNotification(
    notification: Notification,
    subscription: NotificationSubscription,
  ): Promise<void> {
    // Implement push notification sending (Firebase, etc.)
    console.log("Sending push notification:", notification.title);
    // This would integrate with FCM/APNS
  }

  private async sendEmail(notification: Notification): Promise<void> {
    console.log("Sending email:", notification.title);

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Find user email from notification data or userId
      let recipientEmail: string;
      if (notification.data?.email) {
        // External email (for invitations)
        recipientEmail = notification.data.email;
      } else {
        // Registered user
        const user = await prisma.user.findUnique({
          where: { id: notification.userId },
          select: { email: true },
        });
        if (!user?.email) {
          throw new Error("User email not found");
        }
        recipientEmail = user.email;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${notification.title}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">TownKart</h1>
              <p style="color: #e8e8e8; margin: 10px 0 0 0;">Your trusted delivery partner</p>
            </div>

            <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #333; margin-top: 0; margin-bottom: 20px;">${
                notification.title
              }</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">${
                notification.message
              }</p>

              ${
                notification.actions
                  ?.map(
                    (action) => `
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${action.params?.url || "#"}"
                     style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2); transition: all 0.3s ease;">
                    ${action.label}
                  </a>
                </div>
              `,
                  )
                  .join("") || ""
              }

              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
                <p>If you have any questions, feel free to contact our support team.</p>
                <p style="margin: 5px 0;">
                  <a href="mailto:support@payrollBook.com" style="color: #667eea; text-decoration: none;">support@Rozgarpay.com</a>
                </p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2024 Rozgarpay. All rights reserved.</p>
            </div>
          </body>
        </html>
      `;

      const data = await resend.emails.send({
        from: "TownKart <noreply@townkart.com>",
        to: [recipientEmail],
        subject: notification.title,
        html: htmlContent,
        text: `${notification.title}\n\n${notification.message}`,
      });

      console.log("Email sent successfully:", data);
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  // Get WhatsApp template name based on notification type
  private getWhatsAppTemplateName(notificationType: NotificationType): string {
    const templateMap: Record<NotificationType, string> = {
      invitation_company:
        process.env.MSG91_WHATSAPP_TEMPLATE_COMPANY_JOIN_NAME || "company_join",
      invitation_staff:
        process.env.MSG91_WHATSAPP_TEMPLATE_STAFF_JOIN_NAME || "staff_join_v2",
      customer_support:
        process.env.MSG91_WHATSAPP_TEMPLATE_GENERAL_NAME || "townkart_general",
      promotional:
        process.env.MSG91_WHATSAPP_TEMPLATE_GENERAL_NAME || "townkart_general",
      system_alert:
        process.env.MSG91_WHATSAPP_TEMPLATE_GENERAL_NAME || "townkart_general",
      admin_manual:
        process.env.MSG91_WHATSAPP_TEMPLATE_GENERAL_NAME || "townkart_general",
      staff_manual:
        process.env.MSG91_WHATSAPP_TEMPLATE_GENERAL_NAME || "townkart_general",
    };

    return (
      templateMap[notificationType] ||
      process.env.MSG91_WHATSAPP_TEMPLATE_GENERAL_NAME ||
      "townkart_general"
    );
  }

  private async sendWhatsApp(notification: Notification): Promise<void> {
    console.log("📱 Sending WhatsApp:", notification.title);
    console.log("📱 Notification type:", notification.type);

    try {
      const authKey = process.env.MSG91_WHATSAPP_AUTH_KEY;
      const templateName = this.getWhatsAppTemplateName(notification.type);
      const namespace =
        process.env.MSG91_WHATSAPP_NAMESPACE ||
        "0a0d82ce_9390_423d_85f0_2c79dbeb5ae7";
      const integratedNumber =
        process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || "919784740736";

      console.log("📱 Using template:", templateName);
      console.log("📱 Using namespace:", namespace);
      console.log("📱 Using integrated number:", integratedNumber);

      // Validate template exists
      if (!templateName || templateName === "townkart_general") {
        console.warn(
          "⚠️  Using fallback template. Make sure templates are configured in MSG91:",
        );
        console.warn("⚠️  - townkart_invitation_v2 (for invitations)");
        console.warn("⚠️  - townkart_order_update (for orders)");
        console.warn("⚠️  - townkart_delivery (for deliveries)");
        console.warn("⚠️  - townkart_payment (for payments)");
        console.warn("⚠️  - townkart_general (fallback)");
      }

      if (!authKey) {
        console.log(`[MOCK WhatsApp] Message: ${notification.message}`);
        console.log(
          `[MOCK WhatsApp] Please configure MSG91_WHATSAPP_AUTH_KEY in your .env file`,
        );
        return;
      }

      // Find user phone number
      if (!notification.data?.phone) {
        // External phone (for invitations)
        throw new Error("phone number is requited to send notifications...");
      }

      // Clean phone number (ensure it starts with country code)
      const cleanPhone = notification.data.phone.startsWith("+91")
        ? notification.data.phone
        : `+91${notification.data.phone.replace(/^\+91/, "").replace(/\D/g, "")}`;

      if (cleanPhone.length !== 13 || !cleanPhone.startsWith("+91")) {
        throw new Error("Invalid phone number format. Must be +91XXXXXXXXXX");
      }

      // Prepare WhatsApp template message using the new MSG91 API format
      let components: any = {};

      // Template components based on notification type
      switch (notification.type) {
        case "invitation_company":
          components = {
            body_1: {
              type: "text",
              value: notification.data?.companyName || "team member",
            },

            body_2: {
              type: "text",
              value: notification.data?.invitationUrl || "#",
            },
          };
          break;
        case "invitation_staff":
          components = {
            body_1: {
              type: "text",
              value: notification.data?.StaffName || "team member",
            },
            body_2: {
              type: "text",
              value: notification.data?.companyName || "N/A",
            },
            button_1: {
              subtype: "url",
              type: "text",
              value: notification.data.invitationUrl,
            },
          };
          break;

        default:
          // Generic template for other notifications
          components = {
            body_1: {
              type: "text",
              value: notification.message,
            },
          };
          break;
      }

      const whatsappData = {
        integrated_number: integratedNumber,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: templateName,
            language: {
              code: "en",
              policy: "deterministic",
            },
            namespace: namespace,
            to_and_components: [
              {
                to: [cleanPhone],
                components: components,
              },
            ],
          },
        },
      };

      const response = await fetch(
        `https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/`,
        {
          method: "POST",
          headers: {
            authkey: authKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(whatsappData),
        },
      );

      const result = await response.json();
      console.log(result);
      if (!response.ok || result.error) {
        console.error("WhatsApp API Error:", {
          status: response.status,
          statusText: response.statusText,
          result: result,
        });
        throw new Error(
          result.message ||
            result.error ||
            `WhatsApp API error: ${response.status}`,
        );
      }

      console.log(
        `✅ WhatsApp message sent successfully via MSG91: ${
          result.requestId || result.messageId || "Success"
        }`,
      );
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      throw error;
    }
  }

  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private interpolateObject(
    obj: Record<string, any>,
    data: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        result[key] = this.interpolate(value, data);
      } else if (typeof value === "object" && value !== null) {
        result[key] = this.interpolateObject(value, data);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private isQuietHour(subscription: NotificationSubscription): boolean {
    if (!subscription.preferences.quietHours) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const startTime = this.parseTime(subscription.preferences.quietHours.start);
    const endTime = this.parseTime(subscription.preferences.quietHours.end);

    if (startTime < endTime) {
      // Same day range
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 100 + minutes;
  }

  // Cleanup method
  destroy(): void {
    this.notifications.clear();
    this.subscriptions.clear();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();

// Alias for backward compatibility
export const notificationService = notificationManager;

// Utility functions
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    customer_support: "💬",
    promotional: "🎉",
    system_alert: "⚠️",
    admin_manual: "📢",
    staff_manual: "🏪",
    invitation_company: "📨",
    invitation_staff: "📨",
  };
  return icons[type] || "🔔";
}

export function getNotificationColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
  };
  return colors[priority];
}

export function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
