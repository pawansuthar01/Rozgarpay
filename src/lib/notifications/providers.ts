// ============================================
// Notification Providers
// Email and WhatsApp providers with retry logic and rate limiting
// ============================================

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "./types";
import { sanitizeMsg91Text } from "../utils";

// ============================================
// Rate Limiting State
// ============================================
interface RateLimitState {
  email: { count: number; resetAt: Date };
  whatsapp: { count: number; resetAt: Date };
}

// In-memory rate limit state (in production, use Redis)
const rateLimitState: RateLimitState = {
  email: { count: 0, resetAt: new Date() },
  whatsapp: { count: 0, resetAt: new Date() },
};

// Rate limits (per minute)
const RATE_LIMITS = {
  email: { maxRequests: 50, windowMs: 60 * 1000 },
  whatsapp: { maxRequests: 30, windowMs: 60 * 1000 },
};

// ============================================
// Circuit Breaker State
// ============================================
interface CircuitState {
  email: { failures: number; lastFailure: Date; isOpen: boolean };
  whatsapp: { failures: number; lastFailure: Date; isOpen: boolean };
}

const circuitState: CircuitState = {
  email: { failures: 0, lastFailure: new Date(), isOpen: false },
  whatsapp: { failures: 0, lastFailure: new Date(), isOpen: false },
};

const CIRCUIT_THRESHOLD = 5; // Failures before opening circuit
const CIRCUIT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ============================================
// Utility Functions
// ============================================

function checkRateLimit(provider: "email" | "whatsapp"): boolean {
  const now = new Date();
  const state = rateLimitState[provider];
  const limit = RATE_LIMITS[provider];

  if (now > state.resetAt) {
    state.count = 0;
    state.resetAt = new Date(now.getTime() + limit.windowMs);
  }

  return state.count >= limit.maxRequests;
}

function incrementRateLimit(provider: "email" | "whatsapp"): void {
  rateLimitState[provider].count++;
}

function isCircuitOpen(provider: "email" | "whatsapp"): boolean {
  const state = circuitState[provider];
  if (!state.isOpen) return false;

  const now = new Date();
  if (now.getTime() - state.lastFailure.getTime() > CIRCUIT_TIMEOUT) {
    state.isOpen = false;
    state.failures = 0;
    return false;
  }

  return true;
}

function recordFailure(provider: "email" | "whatsapp"): void {
  const state = circuitState[provider];
  state.failures++;
  state.lastFailure = new Date();

  if (state.failures >= CIRCUIT_THRESHOLD) {
    state.isOpen = true;
    console.warn(
      `[${provider.toUpperCase()}] Circuit opened due to ${state.failures} failures`,
    );
  }
}

function recordSuccess(provider: "email" | "whatsapp"): void {
  circuitState[provider].failures = 0;
  circuitState[provider].isOpen = false;
}

async function logNotification(
  type: string,
  channel: string,
  recipient: string,
  success: boolean,
  error?: string,
  messageId?: string,
): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        type,
        channel,
        recipient,
        status: success ? "sent" : "failed",
        errorMessage: error,
        provider: channel === "email" ? "Resend" : "MSG91",
        messageId,
        sentAt: success ? new Date() : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to log notification:", err);
  }
}

function generateEmailHtml(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Rozgarpay</h1>
          <p style="color: #e8e8e8; margin: 10px 0 0 0;">Your company management partner</p>
        </div>
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-top: 0; margin-bottom: 20px;">${title}</h2>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">${message}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rozgarpay. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
}

function getWhatsAppTemplate(type: NotificationType): string {
  const templateMap: Record<NotificationType, string> = {
    company_join_link:
      process.env.MSG91_WHATSAPP_TEMPLATE_COMPANY_JOIN_NAME ||
      "company_join_link",
    company_staff_join:
      process.env.MSG91_WHATSAPP_TEMPLATE_STAFF_JOIN_NAME ||
      "company_staff_join",
    salary_setup_pending:
      process.env.MSG91_WHATSAPP_TEMPLATE_SALARY_SETUP_PENDING_NAME ||
      "salary_setup_pending",
    salary_setup_done:
      process.env.MSG91_WHATSAPP_TEMPLATE_SALARY_DONE_NAME ||
      "salary_setup_done",
    promotional:
      process.env.MSG91_WHATSAPP_TEMPLATE_PROMOTIONAL_NAME || "promotional",
    system_alert:
      process.env.MSG91_WHATSAPP_TEMPLATE_SYSTEM_ALERT_NAME || "system_alert",
    salary_padding:
      process.env.MSG91_WHATSAPP_TEMPLATE_SALARY_NAME || "salary_payment",
    welcome_message:
      process.env.MSG91_WHATSAPP_TEMPLATE_WELCOME_NAME || "welcome_message",
    protection:
      process.env.MSG91_WHATSAPP_TEMPLATE_PROTECTION_NAME || "protection_alert",
    customer_support:
      process.env.MSG91_WHATSAPP_TEMPLATE_GENERAL_NAME || "townkart_general",

    admin_manual:
      process.env.MSG91_WHATSAPP_TEMPLATE_GENERAL_NAME || "townkart_general",
    staff_manual:
      process.env.MSG91_WHATSAPP_TEMPLATE_GENERAL_NAME || "townkart_general",
  };

  return templateMap[type] || "townkart_general";
}

function buildWhatsAppComponents(notification: {
  message: string;
  data?: {
    companyName?: string;
    staffName?: string;
    token?: string;
    adminName?: string;
    message?: string;
    title?: string;
    actionUrl?: string;
  };
  type: NotificationType;
}): Record<string, any> {
  const { type, data } = notification;
  switch (type) {
    case "company_join_link":
      return {
        body_1: { type: "text", value: data?.companyName || "team member" },
        button_1: { subtype: "url", type: "text", value: data?.token || "#" },
      };
    case "company_staff_join":
      return {
        body_1: { type: "text", value: data?.staffName || "team member" },
        body_2: { type: "text", value: data?.companyName || "team member" },
        button_1: { subtype: "url", type: "text", value: data?.token || "#" },
      };
    case "salary_setup_pending":
      return {
        body_1: { type: "text", value: data?.companyName || "N/A" },
        body_2: { type: "text", value: data?.staffName || "team member" },
        button_1: { subtype: "url", type: "text", value: "/setup" },
      };
    case "salary_setup_done":
      return {
        body_1: { type: "text", value: data?.staffName || "team member" },
      };
    case "system_alert":
      return {
        body_1: {
          type: "text",
          value: sanitizeMsg91Text(data?.message) || "team member",
        },
        button_1: {
          subtype: "url",
          type: "text",
          value: data?.actionUrl || "#",
        },
      };
    case "promotional":
      return {
        body_1: {
          type: "text",
          value: sanitizeMsg91Text(data?.title) || "join now",
        },
        body_2: {
          type: "text",
          value: sanitizeMsg91Text(data?.message) || "offers",
        },
        button_1: {
          subtype: "url",
          type: "text",
          value: data?.actionUrl || "#",
        },
      };

    default:
      return {
        body_1: { type: "text", value: notification.message },
      };
  }
}

// ============================================
// Email Provider
// ============================================

export const emailProvider = {
  async send(notification: {
    id: string;
    userId: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    type: NotificationType;
  }): Promise<boolean> {
    if (isCircuitOpen("email")) {
      console.warn("[EMAIL] Circuit is open, skipping");
      await logNotification(
        notification.type,
        "email",
        notification.userId,
        false,
        "Circuit open",
      );
      return false;
    }

    if (checkRateLimit("email")) {
      console.warn("[EMAIL] Rate limit exceeded");
      await logNotification(
        notification.type,
        "email",
        notification.userId,
        false,
        "Rate limit exceeded",
      );
      return false;
    }

    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.warn("[EMAIL] RESEND_API_KEY not configured");
        recordFailure("email");
        await logNotification(
          notification.type,
          "email",
          notification.userId || notification.data?.email || "unknown",
          false,
          "API key not configured",
        );
        return false;
      }

      // For external notifications, use data.email directly
      let recipientEmail = "";
      if (notification.userId && notification.userId !== "") {
        // Registered user - look up by userId
        const user = await prisma.user.findUnique({
          where: { id: notification.userId },
          select: { email: true },
        });
        recipientEmail = user?.email || "";
      } else if (notification.data?.email) {
        // External notification - use provided email
        recipientEmail = notification.data.email;
      }

      if (!recipientEmail) {
        console.warn(`[EMAIL] No email address available`);
        await logNotification(
          notification.type,
          "email",
          notification.data?.email || "unknown",
          false,
          "No email address",
        );
        return true;
      }

      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@rozgarpay.in";
      const fromName = process.env.RESEND_FROM_NAME || "rozgarpay";

      const htmlContent = generateEmailHtml(
        notification.title,
        notification.message,
      );

      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [recipientEmail],
        subject: notification.title,
        html: htmlContent,
        text: `${notification.title}\n\n${notification.message}`,
      });

      incrementRateLimit("email");
      recordSuccess("email");

      if (result.error) {
        console.error("[EMAIL] Resend error:", result.error);
        recordFailure("email");
        await logNotification(
          notification.type,
          "email",
          recipientEmail,
          false,
          result.error.message,
        );
        return false;
      }

      console.log("[EMAIL] Sent successfully:", result.data?.id);
      await logNotification(
        notification.type,
        "email",
        recipientEmail,
        true,
        undefined,
        result.data?.id,
      );
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("[EMAIL] Failed:", errorMessage);
      recordFailure("email");
      await logNotification(
        notification.type,
        "email",
        notification.userId || notification.data?.email || "unknown",
        false,
        errorMessage,
      );
      return false;
    }
  },
};

// ============================================
// WhatsApp Provider
// ============================================

export const whatsappProvider = {
  async send(notification: {
    id: string;
    userId: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    type: NotificationType;
  }): Promise<boolean> {
    if (isCircuitOpen("whatsapp")) {
      console.warn("[WHATSAPP] Circuit is open, skipping");
      await logNotification(
        notification.type,
        "whatsapp",
        notification.userId,
        false,
        "Circuit open",
      );
      return false;
    }

    if (checkRateLimit("whatsapp")) {
      console.warn("[WHATSAPP] Rate limit exceeded");
      await logNotification(
        notification.type,
        "whatsapp",
        notification.userId,
        false,
        "Rate limit exceeded",
      );
      return false;
    }

    try {
      const authKey = process.env.MSG91_WHATSAPP_AUTH_KEY;
      if (!authKey) {
        console.warn("[WHATSAPP] MSG91_WHATSAPP_AUTH_KEY not configured");
        recordFailure("whatsapp");
        await logNotification(
          notification.type,
          "whatsapp",
          notification.userId || notification.data?.phone || "unknown",
          false,
          "API key not configured",
        );
        return false;
      }

      // For external notifications, use data.phone directly
      let recipientPhone = "";
      if (notification.userId && notification.userId !== "") {
        // Registered user - look up by userId
        const user = await prisma.user.findUnique({
          where: { id: notification.userId },
          select: { phone: true },
        });
        recipientPhone = user?.phone || "";
      } else if (notification.data?.phone) {
        // External notification - use provided phone
        recipientPhone = notification.data.phone;
      }

      if (!recipientPhone) {
        console.warn(`[WHATSAPP] No phone number available`);
        await logNotification(
          notification.type,
          "whatsapp",
          notification.data?.phone || "unknown",
          false,
          "No phone number",
        );
        return true;
      }

      const cleanPhone = recipientPhone.startsWith("+91")
        ? recipientPhone
        : `+91${recipientPhone.replace(/^\+91/, "").replace(/\D/g, "")}`;

      if (cleanPhone.length !== 13 || !cleanPhone.startsWith("+91")) {
        console.warn(`[WHATSAPP] Invalid phone format: ${cleanPhone}`);
        await logNotification(
          notification.type,
          "whatsapp",
          notification.userId,
          false,
          "Invalid phone format",
        );
        return true;
      }
      const templateName = getWhatsAppTemplate(notification.type);
      const namespace =
        process.env.MSG91_WHATSAPP_NAMESPACE ||
        "11b36669_320a_4760_9781_092a613d67f7";
      const integratedNumber =
        process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || "918619218048";

      const components = buildWhatsAppComponents(notification);
      if (templateName == "townkart_general") {
        const errorMsg = `templateName is not valid check it ...`;
        recordFailure("whatsapp");
        await logNotification(
          notification.type,
          "whatsapp",
          recipientPhone,
          false,
          errorMsg,
        );
        return false;
      }

      const whatsappData = {
        integrated_number: integratedNumber,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: templateName,
            language: { code: "en", policy: "deterministic" },
            namespace,
            to_and_components: [
              {
                to: [cleanPhone],
                components,
              },
            ],
          },
        },
      };
      const response = await fetch(
        "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
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
      if (!response.ok || result?.errors) {
        recordFailure("whatsapp");
        await logNotification(
          notification.type,
          "whatsapp",
          recipientPhone,
          false,
          JSON.stringify(result?.errors || "MSG91 error"),
        );
        return false;
      }

      await logNotification(
        notification.type,
        "whatsapp",
        recipientPhone,
        true,
      );

      return true;
    } catch (error: any) {
      console.error("[WHATSAPP] Send error:", error);
      recordFailure("whatsapp");

      await logNotification(
        notification.type,
        "whatsapp",
        notification.userId || notification.data?.phone || "unknown",
        false,
        error?.message || "Unhandled error",
      );

      return false;
    }
  },
};
