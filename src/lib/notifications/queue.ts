// ============================================
// Notification Queue Service
// Fire-and-forget queue with retry logic
// ============================================

import { prisma } from "@/lib/prisma";
import { NotificationChannel, NotificationType } from "./types";
import { getDate } from "../attendanceUtils";
import { getCurrentTime } from "../utils";

// Queue job status
const QUEUE_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRYING: "retrying",
} as const;

export interface QueueJob {
  id: string;
  notificationId: string;
  channel: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string;
  nextAttemptAt?: Date;
  createdAt: Date;
  processedAt?: Date;
}

export interface EnqueueOptions {
  channel: NotificationChannel;
  maxAttempts?: number;
  priority?: number;
  delayMs?: number; // Delay before first attempt
}

export class NotificationQueue {
  private readonly DEFAULT_MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000]; // 1min, 5min, 30min

  /**
   * Enqueue a notification job for async processing
   * Returns immediately - processing happens in background
   */
  async enqueue(
    notificationId: string,
    channel: NotificationChannel,
    options?: EnqueueOptions,
  ): Promise<{ jobId: string }> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const maxAttempts = options?.maxAttempts || this.DEFAULT_MAX_ATTEMPTS;
    const nextAttemptAt = options?.delayMs
      ? getDate(new Date(Date.now() + options.delayMs))
      : getCurrentTime();

    // Create job record in database (using NotificationLog as proxy for now)
    await prisma.notificationLog.create({
      data: {
        type: "queue_job",
        channel: channel,
        recipient: notificationId,
        status: "pending",
        provider: "queue",
        metadata: {
          jobId,
          notificationId,
          channel,
          status: QUEUE_STATUS.PENDING,
          attemptCount: 0,
          maxAttempts,
          nextAttemptAt: nextAttemptAt.toISOString(),
        },
      },
    });

    // Trigger async processing (fire-and-forget)
    this.processJob(jobId, notificationId, channel).catch((err) => {
      console.error(`Background job ${jobId} failed:`, err);
    });

    return { jobId };
  }

  /**
   * Process a job asynchronously
   */
  private async processJob(
    jobId: string,
    notificationId: string,
    channel: string,
  ): Promise<void> {
    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, QUEUE_STATUS.PROCESSING);

      // Get the notification from storage
      const { notificationStorage } = await import("./storage");
      const notification =
        await notificationStorage.getNotificationById(notificationId);

      if (!notification) {
        console.error(
          `Notification ${notificationId} not found for job ${jobId}`,
        );
        await this.updateJobStatus(
          jobId,
          QUEUE_STATUS.FAILED,
          "Notification not found",
        );
        return;
      }

      // Send based on channel
      const { emailProvider, whatsappProvider } = await import("./providers");

      let success = false;

      switch (channel) {
        case "email":
          success = await emailProvider.send(notification);
          break;
        case "whatsapp":
          success = await whatsappProvider.send(notification);
          break;
        case "in_app":
        case "push":
          // These are handled synchronously
          success = true;
          break;
        default:
          success = true;
      }

      if (success) {
        await this.updateJobStatus(jobId, QUEUE_STATUS.COMPLETED);
      } else {
        await this.handleFailure(jobId, notificationId, channel, "Send failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await this.handleFailure(jobId, notificationId, channel, errorMessage);
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleFailure(
    jobId: string,
    notificationId: string,
    channel: string,
    error: string,
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    const attemptCount = job.attemptCount + 1;

    if (attemptCount < job.maxAttempts) {
      // Schedule retry
      const delayMs =
        this.RETRY_DELAYS[attemptCount - 1] || this.RETRY_DELAYS[2];
      const nextAttemptAt = new Date(Date.now() + delayMs);

      // Merge with existing metadata, only update changing fields
      await prisma.notificationLog.updateMany({
        where: {
          metadata: { path: ["jobId"], equals: jobId },
        },
        data: {
          status: "pending",
          errorMessage: error,
          metadata: {
            ...job,
            status: QUEUE_STATUS.RETRYING,
            attemptCount,
            nextAttemptAt: nextAttemptAt.toISOString(),
            lastError: error,
          },
        },
      });

      // Schedule retry
      setTimeout(() => {
        this.processJob(jobId, notificationId, channel).catch(console.error);
      }, delayMs);
    } else {
      // Max retries exceeded
      await this.updateJobStatus(jobId, QUEUE_STATUS.FAILED, error);
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    error?: string,
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;
    const dbStatus =
      status === QUEUE_STATUS.COMPLETED
        ? "sent"
        : status === QUEUE_STATUS.PROCESSING || status === QUEUE_STATUS.RETRYING
          ? "pending"
          : "failed";

    // Merge with existing metadata, only update changing fields
    await prisma.notificationLog.updateMany({
      where: {
        metadata: { path: ["jobId"], equals: jobId },
      },
      data: {
        status: dbStatus,
        errorMessage: error || null,
        metadata: {
          ...job,
          status,
          lastError: error,
          processedAt: getCurrentTime().toISOString(),
        },
      },
    });
  }

  /**
   * Get job by ID
   */
  private async getJob(jobId: string): Promise<QueueJob | null> {
    const logs = await prisma.notificationLog.findMany({
      where: {
        metadata: { path: ["jobId"], equals: jobId },
      },
      take: 1,
    });

    if (logs.length === 0) return null;

    const metadata = logs[0].metadata as {
      jobId: string;
      notificationId: string;
      channel: string;
      status: string;
      attemptCount: number;
      maxAttempts: number;
      nextAttemptAt?: string;
      lastError?: string;
    };

    return {
      id: metadata.jobId,
      notificationId: metadata.notificationId,
      channel: metadata.channel,
      status: metadata.status || QUEUE_STATUS.PENDING,
      attemptCount: metadata.attemptCount || 0,
      maxAttempts: metadata.maxAttempts || this.DEFAULT_MAX_ATTEMPTS,
      lastError: metadata.lastError,
      nextAttemptAt: metadata.nextAttemptAt
        ? new Date(metadata.nextAttemptAt)
        : undefined,
      createdAt: logs[0].createdAt,
      processedAt: logs[0].sentAt || undefined,
    };
  }

  /**
   * Get pending jobs count
   */
  async getPendingCount(): Promise<number> {
    return prisma.notificationLog.count({
      where: {
        type: "queue_job",
        status: "pending",
      },
    });
  }

  /**
   * Get failed jobs for monitoring
   */
  async getFailedJobs(limit = 50): Promise<QueueJob[]> {
    const logs = await prisma.notificationLog.findMany({
      where: {
        type: "queue_job",
        status: "failed",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return logs.map((log) => {
      const metadata = log.metadata as {
        jobId: string;
        notificationId: string;
        channel: string;
        attemptCount: number;
        maxAttempts: number;
        lastError?: string;
      };

      return {
        id: metadata.jobId,
        notificationId: metadata.notificationId,
        channel: metadata.channel,
        status: QUEUE_STATUS.FAILED,
        attemptCount: metadata.attemptCount || 0,
        maxAttempts: metadata.maxAttempts || this.DEFAULT_MAX_ATTEMPTS,
        lastError: metadata.lastError,
        createdAt: log.createdAt,
        processedAt: log.sentAt || undefined,
      };
    });
  }
}

// Export singleton instance
export const notificationQueue = new NotificationQueue();
