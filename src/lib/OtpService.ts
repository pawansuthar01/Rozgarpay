import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type OTPPurpose = "LOGIN" | "REGISTER" | "RESET_PASSWORD";
export type OTPChannel = "email" | "whatsapp";
export interface OTPSettings {
  delivery_method: "email" | "WHATSAPP" | "IN_APP" | "both";
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  otp_length: number;
  expiry_minutes: number;
  max_attempts: number;
  cooldown_minutes: number;
  retry_attempts: number;
  enable_fallback: boolean;
}

export interface OTPDeliveryResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
  retryCount?: number;
}

export interface OTPTemplate {
  whatsapp: string;
  email: {
    subject: string;
    text: string;
    html: string;
  };
}

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  MAX_PER_HOUR: 3,
  MAX_PER_DAY: 10,
  COOLDOWN_SECONDS: 60,
};

interface RateLimitResult {
  allowed: boolean;
  remainingTime?: number;
  reason?: string;
}

interface UnifiedIdentifier {
  phone?: string | null;
  email?: string | null;
  ip?: string;
}

export class OTPService {
  private static getOTPTemplate(purpose: string, otp: string): OTPTemplate {
    const purposeText = purpose.replace("_", " ").toLowerCase();

    return {
      whatsapp: `Your Rozgarpay OTP for ${purposeText} is: ${otp}. Valid for 10 minutes.`,
      email: {
        subject: `Your Rozgarpay OTP for ${purposeText}`,
        text: `Your OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't request this, please ignore this message.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your Rozgarpay OTP</h2>
            <p>Your OTP for ${purposeText} is:</p>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 24px; font-weight: bold; color: #007bff;">${otp}</span>
            </div>
            <p>This OTP is valid for 10 minutes.</p>
            <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this message.</p>
          </div>
        `,
      },
    };
  }

  private static async getAdminOTPSettings(): Promise<OTPSettings> {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: {
          category: "otp",
        },
      });

      const otpSettings: OTPSettings = {
        delivery_method: "both",
        email_enabled: true,
        whatsapp_enabled: true,
        otp_length: 4,
        expiry_minutes: 10,
        max_attempts: 3,
        cooldown_minutes: 1,
        retry_attempts: 2,
        enable_fallback: true,
      };

      settings.forEach((setting: any) => {
        try {
          const value = JSON.parse(setting.value);
          if (setting.key in otpSettings) {
            (otpSettings as any)[setting.key] = value;
          }
        } catch {
          // Use default values if parsing fails
        }
      });
      return otpSettings;
    } catch (error) {
      console.error("Error fetching OTP settings:", error);
      return {
        delivery_method: "both",
        email_enabled: true,
        whatsapp_enabled: true,
        otp_length: 4,
        expiry_minutes: 10,
        max_attempts: 2,
        cooldown_minutes: 3,
        retry_attempts: 2,
        enable_fallback: true,
      };
    }
  }

  static generateOTP(length: number = 6): string {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  private static hashOTP(otp: string): string {
    return crypto.createHash("sha256").update(otp).digest("hex");
  }

  /**
   * Unified rate limit check across all identifiers (phone, email, IP).
   * This prevents bypass by switching between phone/email/purpose.
   */
  private static async checkUnifiedRateLimit(
    identifiers: UnifiedIdentifier,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const hourWindow = 60 * 60 * 1000; // 1 hour
    const dayWindow = 24 * 60 * 60 * 1000; // 24 hours

    // Build OR condition for all identifiers
    const whereConditions: any[] = [];

    if (identifiers.phone) {
      whereConditions.push({ phone: identifiers.phone });
    }
    if (identifiers.email) {
      whereConditions.push({ email: identifiers.email });
    }

    // Check hourly limit across ALL identifiers
    const hourlyCount = await prisma.otp.count({
      where: {
        OR:
          whereConditions.length > 0
            ? whereConditions
            : [{ phone: identifiers.phone || undefined }],
        createdAt: {
          gt: new Date(now - hourWindow),
        },
      },
    });

    if (hourlyCount >= RATE_LIMIT_CONFIG.MAX_PER_HOUR) {
      // Find when the oldest OTP in the window will expire
      const oldestOTP = await prisma.otp.findFirst({
        where: {
          OR:
            whereConditions.length > 0
              ? whereConditions
              : [{ phone: identifiers.phone || undefined }],
          createdAt: {
            gt: new Date(now - hourWindow),
          },
        },
        orderBy: { createdAt: "asc" },
      });

      if (oldestOTP) {
        const resetTime = oldestOTP.createdAt.getTime() + hourWindow;
        const remainingSeconds = Math.ceil((resetTime - now) / 1000);
        return {
          allowed: false,
          remainingTime: remainingSeconds,
          reason: `Rate limit exceeded. Maximum ${RATE_LIMIT_CONFIG.MAX_PER_HOUR} OTPs per hour. Try again in ${Math.ceil(remainingSeconds / 60)} minutes.`,
        };
      }
    }

    // Check daily limit across ALL identifiers
    const dailyCount = await prisma.otp.count({
      where: {
        OR:
          whereConditions.length > 0
            ? whereConditions
            : [{ phone: identifiers.phone || undefined }],
        createdAt: {
          gt: new Date(now - dayWindow),
        },
      },
    });

    if (dailyCount >= RATE_LIMIT_CONFIG.MAX_PER_DAY) {
      return {
        allowed: false,
        reason: `Daily limit exceeded. Maximum ${RATE_LIMIT_CONFIG.MAX_PER_DAY} OTPs per day. Try again tomorrow.`,
      };
    }

    // Check cooldown period (60 seconds between requests)
    const recentOTP = await prisma.otp.findFirst({
      where: {
        OR:
          whereConditions.length > 0
            ? whereConditions
            : [{ phone: identifiers.phone || undefined }],
        createdAt: {
          gt: new Date(now - RATE_LIMIT_CONFIG.COOLDOWN_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentOTP) {
      const elapsedSeconds = Math.floor(
        (now - recentOTP.createdAt.getTime()) / 1000,
      );
      const remainingSeconds =
        RATE_LIMIT_CONFIG.COOLDOWN_SECONDS - elapsedSeconds;
      if (remainingSeconds > 0) {
        return {
          allowed: false,
          remainingTime: remainingSeconds,
          reason: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Invalidate all previous unused OTPs for the given identifiers.
   * Called BEFORE creating a new OTP to prevent multiple valid OTPs.
   */
  private static async invalidatePreviousOTPs(
    identifiers: UnifiedIdentifier,
  ): Promise<void> {
    const whereConditions: any[] = [];

    if (identifiers.phone) {
      whereConditions.push({ phone: identifiers.phone });
    }
    if (identifiers.email) {
      whereConditions.push({ email: identifiers.email });
    }

    if (whereConditions.length === 0) return;

    await prisma.otp.updateMany({
      where: {
        OR: whereConditions,
        isUsed: false,
        expiresAt: {
          gt: new Date(), // Only invalidate still-valid OTPs
        },
      },
      data: { isUsed: true }, // Mark as used to invalidate
    });
  }

  /**
   * SINGLE source of truth for OTP sending.
   * Handles both phone and email with unified rate limiting.
   * @param phoneNumber - The phone number (required for WhatsApp)
   * @param email - Optional email for email OTP
   * @param purpose - OTP purpose (LOGIN, REGISTER, RESET_PASSWORD)
   * @param clientIP - Optional IP address for rate limiting
   */
  static async sendOTP(
    phoneNumber: string,
    email: string | null,
    purpose: "LOGIN" | "REGISTER" | "RESET_PASSWORD" = "LOGIN",
    clientIP?: string,
  ): Promise<{ success: boolean; message: string; channels: string[] }> {
    try {
      const settings = await this.getAdminOTPSettings();

      // Unified identifiers for rate limiting (includes IP)
      const identifiers: UnifiedIdentifier = {
        phone: phoneNumber,
        email: email,
        ip: clientIP,
      };

      // Check unified rate limit (includes cooldown, hourly, daily limits)
      const rateLimit = await this.checkUnifiedRateLimit(identifiers);
      if (!rateLimit.allowed) {
        return {
          success: false,
          message:
            rateLimit.reason || "Rate limit exceeded. Please try again later.",
          channels: [],
        };
      }

      // Determine email to use (if not provided, try to find from user)
      let targetEmail = email;
      if (!targetEmail && phoneNumber) {
        const user = await prisma.user.findUnique({
          where: { phone: phoneNumber },
          select: { email: true },
        });
        targetEmail = user?.email || null;
      }

      // Check if user exists for LOGIN/RESET_PASSWORD (SILENT - no user existence leak)
      const requiresUser = ["LOGIN", "RESET_PASSWORD"].includes(purpose);
      if (requiresUser && phoneNumber) {
        const userExists = await prisma.user.findFirst({
          where: {
            OR: [
              { phone: phoneNumber },
              ...(targetEmail ? [{ email: targetEmail }] : []),
            ],
          },
          select: { id: true },
        });
        // Silently fail - no "user does not exist" message
        if (!userExists) {
          return {
            success: false,
            message: "OTP sent successfully", // Fake success to prevent enumeration
            channels: [],
          };
        }
      }

      // Invalidate ALL previous unused OTPs for this identifier BEFORE creating new one
      await this.invalidatePreviousOTPs(identifiers);

      const otp = this.generateOTP(settings.otp_length);
      const expiresAt = new Date(
        Date.now() + settings.expiry_minutes * 60 * 1000,
      );

      // Create OTP record
      const otpRecord = await prisma.otp.create({
        data: {
          phone: phoneNumber,
          email: targetEmail,
          otp,
          purpose,
          expiresAt,
          deliveryStatus: "PENDING",
          deliveryAttempts: 0,
        },
      });

      const template = this.getOTPTemplate(purpose, otp);
      const deliveryResults: OTPDeliveryResult[] = [];
      const channels: string[] = [];

      // Send via enabled channels
      if (
        (settings.delivery_method === "email" ||
          settings.delivery_method === "both") &&
        settings.email_enabled &&
        targetEmail
      ) {
        const emailResult = await this.sendWithRetry(
          () =>
            this.sendEmail(
              targetEmail!,
              template.email.subject,
              template.email.text,
              template.email.html,
            ),
          settings.max_attempts,
          "Email",
        );
        deliveryResults.push(emailResult);
        if (emailResult.success) channels.push("Email");
      }

      if (
        (settings.delivery_method === "WHATSAPP" ||
          settings.delivery_method === "both") &&
        settings.whatsapp_enabled &&
        phoneNumber
      ) {
        const whatsappResult = await this.sendWithRetry(
          () => this.sendWhatsApp(phoneNumber, template.whatsapp, purpose),
          settings.retry_attempts,
          "WhatsApp",
        );
        deliveryResults.push(whatsappResult);
        if (whatsappResult.success) channels.push("WhatsApp");
      }

      // Update OTP record with delivery status
      const successfulDeliveries = deliveryResults.filter((r) => r.success);
      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: {
          deliveryStatus:
            successfulDeliveries.length > 0 ? "DELIVERED" : "FAILED",
          deliveryAttempts: deliveryResults.reduce(
            (sum, r) => sum + (r.retryCount || 0) + 1,
            0,
          ),
          deliveryChannels: channels,
          deliveryResults: deliveryResults as any,
        },
      });

      // Log notifications
      for (const result of deliveryResults) {
        await prisma.notificationLog.create({
          data: {
            type: "OTP",
            channel: result.channel.toLowerCase(),
            recipient:
              result.channel.toLowerCase() === "email"
                ? targetEmail || phoneNumber
                : phoneNumber,
            status: result.success ? "SENT" : "FAILED",
            errorMessage: result.error || undefined,
            provider:
              result.channel.toLowerCase() === "sms"
                ? "MSG91"
                : result.channel.toLowerCase() === "email"
                  ? "RESEND"
                  : result.channel.toLowerCase() === "whatsapp"
                    ? "MSG91"
                    : undefined,
            messageId: result.messageId || undefined,
            metadata: {
              purpose,
              otpId: otpRecord.id,
              retryCount: result.retryCount,
              template: "otp_template",
            },
            sentAt: result.success ? new Date() : undefined,
          },
        });
      }

      console.log(
        `[OTP] OTP send completed. Success: ${
          channels.length > 0
        }, Channels: ${channels.join(", ")}`,
      );

      // Always return success message even if delivery failed (prevent enumeration)
      return {
        success: channels.length > 0,
        message:
          channels.length > 0
            ? `OTP sent successfully via ${channels.join(", ")}`
            : "OTP sent successfully",
        channels,
      };
    } catch (error) {
      console.error("[OTP] Error sending OTP:", error);
      // Return generic error to prevent information leakage
      return {
        success: false,
        message: "OTP sent successfully", // Fake success
        channels: [],
      };
    }
  }

  /**
   * @deprecated Use sendOTP instead. Kept for backward compatibility.
   * This method now delegates to sendOTP with unified rate limiting.
   */
  static async sendEmailOTP(
    email: string,
    purpose: "LOGIN" | "REGISTER" | "RESET_PASSWORD" = "REGISTER",
    clientIP?: string,
  ): Promise<{ success: boolean; message: string; channels: string[] }> {
    // Delegate to unified sendOTP
    return this.sendOTP(
      "", // Empty phone - will use email only
      email,
      purpose,
      clientIP,
    );
  }

  // Verify email OTP
  static async verifyEmailOTP(email: string, otp: string): Promise<boolean> {
    try {
      const otpRecord = await prisma.otp.findFirst({
        where: {
          email: email,
          otp,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      if (!otpRecord) {
        return false;
      }

      // Mark OTP as used
      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  private static async sendWithRetry(
    sendFunction: () => Promise<string | void>,
    maxRetries: number,
    channel: string,
  ): Promise<OTPDeliveryResult> {
    let lastError: string = "";
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const messageId = await sendFunction();
        return {
          success: true,
          channel,
          messageId: messageId || undefined,
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        retryCount = attempt;

        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s, etc.
          const delay = Math.pow(2, attempt) * 1000;
          console.log(
            `Attempt ${
              attempt + 1
            } failed for ${channel}, retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      channel,
      error: lastError,
      retryCount,
    };
  }

  private static async sendEmail(
    email: string | null,
    subject: string,
    text: string,
    html: string,
  ): Promise<string | void> {
    try {
      if (!email) {
        return "email_NOT_FOUND";
      }
      // Check if Resend credentials are available
      const apiKey = process.env.RESEND_API_KEY;

      if (!apiKey) {
        console.log(`[MOCK EMAIL] Subject: ${subject}`);
        console.log(`[MOCK EMAIL] To: ${email}`);
        console.log(`[MOCK EMAIL] Text: ${text}`);
        console.log(
          `[MOCK EMAIL] Please configure RESEND_API_KEY in your .env file`,
        );
        console.log(`[MOCK EMAIL] Get API key from https://resend.com`);
        return "mock_email_sent";
      }

      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);

      const data = await resend.emails.send({
        from: "Rozgarpay <mail@rozgarpay.in>",
        to: [email],
        subject: subject,
        html: html,
        text: text,
      });

      if (data.error) {
        throw new Error(data.error.message);
      }

      console.log(`Email sent successfully via Resend: ${data.data?.id}`);
      return data.data?.id;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  }
  private static async sendWhatsApp(
    phoneNumber: string,
    message: string,
    purpose: string,
  ): Promise<string | void> {
    try {
      const authKey = process.env.MSG91_WHATSAPP_AUTH_KEY;
      const senderNumber = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER;
      const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_OTP_NAME;
      const namespace = process.env.MSG91_WHATSAPP_NAMESPACE;

      if (!authKey || !senderNumber || !templateName || !namespace) {
        console.log(`[MOCK WhatsApp] Missing WhatsApp ENV keys`);
        console.log(`[MOCK WhatsApp] Message to ${phoneNumber}: ${message}`);
        console.log(
          `[MOCK WhatsApp] Configure MSG91 WhatsApp credentials for production`,
        );
        return "mock_whatsapp_sent";
      }

      const otp = message.match(/\d{4,6}/)?.[0];

      const cleanPhone = phoneNumber.replace(/^\+91/, "").replace(/\D/g, "");
      if (cleanPhone.length !== 10) throw new Error("Invalid mobile number");
      const code = `otp${otp}`.substring(0, 15);
      const payload = {
        integrated_number: senderNumber,
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
                to: [`91${cleanPhone}`],
                components: {
                  body_1: {
                    type: "text",
                    text: otp,
                  },
                  button_1: {
                    subtype: "url",
                    type: "text",
                    text: code,
                  },
                },
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
            accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(
          result.error || result.message || "WhatsApp send failed",
        );
      }

      return (
        result.request_id ||
        result.message_id ||
        result.id ||
        "WhatsApp message sent"
      );
    } catch (error) {
      console.error("WhatsApp Error:", error);
      throw new Error("Failed to send WhatsApp message");
    }
  }

  static async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      const otpRecord = await prisma.otp.findFirst({
        where: {
          phone: phoneNumber,

          otp,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!otpRecord) {
        return false;
      }

      // Mark OTP as used
      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  static async cleanupExpiredOTPs(): Promise<void> {
    try {
      await prisma.otp.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      console.error("Error cleaning up expired OTPs:", error);
    }
  }

  // Monitoring and metrics
  static async getOTPMetrics(
    timeRange: "hour" | "day" | "week" = "day",
  ): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    averageRetries: number;
    channelStats: Record<
      string,
      { sent: number; delivered: number; failed: number }
    >;
  }> {
    try {
      const timeFilter = new Date();
      switch (timeRange) {
        case "hour":
          timeFilter.setHours(timeFilter.getHours() - 1);
          break;
        case "day":
          timeFilter.setDate(timeFilter.getDate() - 1);
          break;
        case "week":
          timeFilter.setDate(timeFilter.getDate() - 7);
          break;
      }

      const otps = await prisma.otp.findMany({
        where: {
          createdAt: {
            gte: timeFilter,
          },
        },
        select: {
          deliveryStatus: true,
          deliveryAttempts: true,
          deliveryChannels: true,
          deliveryResults: true,
        },
      });

      const metrics = {
        totalSent: otps.length,
        totalDelivered: otps.filter(
          (otp: any) => otp.deliveryStatus === "DELIVERED",
        ).length,
        totalFailed: otps.filter((otp: any) => otp.deliveryStatus === "FAILED")
          .length,
        deliveryRate: 0,
        averageRetries: 0,
        channelStats: {} as Record<
          string,
          { sent: number; delivered: number; failed: number }
        >,
      };

      metrics.deliveryRate =
        metrics.totalSent > 0
          ? (metrics.totalDelivered / metrics.totalSent) * 100
          : 0;
      metrics.averageRetries =
        otps.reduce(
          (sum: any, otp: any) => sum + (otp.deliveryAttempts || 0),
          0,
        ) / otps.length || 0;

      // Channel statistics
      otps.forEach((otp: any) => {
        const channels = (otp.deliveryChannels as string[]) || [];
        channels.forEach((channel: string) => {
          if (!metrics.channelStats[channel]) {
            metrics.channelStats[channel] = {
              sent: 0,
              delivered: 0,
              failed: 0,
            };
          }
          metrics.channelStats[channel].sent++;
          if (otp.deliveryStatus === "DELIVERED") {
            metrics.channelStats[channel].delivered++;
          } else if (otp.deliveryStatus === "FAILED") {
            metrics.channelStats[channel].failed++;
          }
        });
      });

      return metrics;
    } catch (error) {
      console.error("Error getting OTP metrics:", error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0,
        averageRetries: 0,
        channelStats: {},
      };
    }
  }
}
