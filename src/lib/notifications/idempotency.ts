// ============================================
// Idempotency Service
// Prevents duplicate notifications using idempotency keys
// ============================================

import { prisma } from "@/lib/prisma";

export interface IdempotencyResult {
  isDuplicate: boolean;
  existingNotificationId?: string;
}

export class IdempotencyService {
  private readonly KEY_PREFIX = "notif_idem";
  private readonly TTL_HOURS = 24;

  /**
   * Check if a notification with this idempotency key already exists
   * Returns { isDuplicate: true, existingNotificationId: "..." } if duplicate found
   * Returns { isDuplicate: false } if safe to proceed
   */
  async check(idempotencyKey: string): Promise<IdempotencyResult> {
    try {
      const existing = await prisma.systemSetting.findFirst({
        where: {
          category: this.KEY_PREFIX,
          key: idempotencyKey,
        },
      });

      if (existing) {
        // Parse notificationId from value
        try {
          const data = JSON.parse(existing.value);
          return {
            isDuplicate: true,
            existingNotificationId: data.notificationId,
          };
        } catch {
          return { isDuplicate: true };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error("Idempotency check failed:", error);
      // On error, allow the operation (fail open for availability)
      return { isDuplicate: false };
    }
  }

  /**
   * Record a notification with its idempotency key
   */
  async record(
    idempotencyKey: string,
    notificationId: string,
    _metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await prisma.systemSetting.create({
        data: {
          category: this.KEY_PREFIX,
          key: idempotencyKey,
          value: JSON.stringify({
            notificationId,
            createdAt: new Date().toISOString(),
            ttl: this.TTL_HOURS,
          }),
          description: `Idempotency key for notification: ${notificationId}`,
        },
      });
    } catch (error) {
      console.error("Failed to record idempotency key:", error);
      // Non-critical, continue even if recording fails
    }
  }

  /**
   * Generate a deterministic idempotency key for a notification
   */
  static generateKey(userId: string, type: string, dataHash: string): string {
    const input = `${userId}:${type}:${dataHash}`;
    // Simple hash function for idempotency key
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `notif_${Math.abs(hash).toString(16)}`;
  }
}

// Export singleton instance
export const idempotencyService = new IdempotencyService();
