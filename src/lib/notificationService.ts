import { prisma } from "./prisma";

export interface NotificationOptions {
  userId: string;
  companyId: string;
  channels: ("EMAIL" | "INAPP" | "WHATSAPP" | "PUSH")[];
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export async function sendNotification(
  options: NotificationOptions
): Promise<void> {
  const { userId, companyId, channels, title, message } = options;

  for (const channel of channels) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        companyId,
        channel,
        title,
        message,
        status: "PENDING",
      },
    });

    try {
      let success = false;

      switch (channel) {
        case "EMAIL":
          success = await sendEmailNotification(userId, title, message);
          break;
        case "INAPP":
          success = await sendInAppNotification(userId, title, message);
          break;
        case "WHATSAPP":
          success = await sendWhatsAppNotification(userId, title, message);
          break;
        case "PUSH":
          success = await sendPushNotification(userId, title, message);
          break;
      }

      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: success ? "SENT" : "FAILED" },
      });
    } catch (error) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: "FAILED" },
      });
    }
  }
}

async function sendEmailNotification(
  userId: string,
  title: string,
  message: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) return false;

  // Stub: Integrate with email provider (e.g., SendGrid, SES)
  console.log(`Sending email to ${user.email}: ${title} - ${message}`);
  return true;
}

async function sendInAppNotification(
  userId: string,
  title: string,
  message: string
): Promise<boolean> {
  // Stub: Store in in-app notification table or send via WebSocket
  console.log(
    `Sending in-app notification to ${userId}: ${title} - ${message}`
  );
  return true;
}

async function sendWhatsAppNotification(
  userId: string,
  title: string,
  message: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.phone) return false;

  // Stub: Integrate with WhatsApp Business API
  console.log(`Sending WhatsApp to ${user.phone}: ${title} - ${message}`);
  return true;
}

async function sendPushNotification(
  userId: string,
  title: string,
  message: string
): Promise<boolean> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  if (subscriptions.length === 0) return false;

  // Stub: Send push notifications using web-push library
  console.log(
    `Sending push notifications to ${subscriptions.length} subscriptions: ${title} - ${message}`
  );
  return true;
}
