// ============================================
// Notification Types - Core Definitions
// ============================================

export type NotificationType =
  | "customer_support"
  | "promotional"
  | "system_alert"
  | "admin_manual"
  | "staff_manual"
  | "company_join_link"
  | "company_staff_join"
  | "salary_padding"
  | "staff_join"
  | "salary_setup_pending"
  | "salary_setup_done"
  | "welcome_message"
  | "protection";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export type NotificationChannel = "in_app" | "push" | "email" | "whatsapp";

export type NotificationStatus = "pending" | "processing" | "sent" | "failed";

export type QueueStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "retrying";

// ============================================
// Template Interface
// ============================================
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  variables: string[];
  actions?: Array<{
    label: string;
    action: string;
    params: Record<string, any>;
  }>;
}

// ============================================
// Database Models (mirroring Prisma schema)
// ============================================
export interface NotificationRecord {
  id: string;
  userId: string;
  companyId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  meta?: Record<string, any>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationQueueItem {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: QueueStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: Date;
  lastError?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
}

export interface NotificationLog {
  id: string;
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
  createdAt: Date;
}

// ============================================
// API Request/Response Types
// ============================================
export interface SendNotificationRequest {
  userId: string;
  type: NotificationType;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  idempotencyKey?: string; // For preventing duplicates
}

export interface SendNotificationResponse {
  success: boolean;
  notificationId?: string;
  queued?: boolean;
  errors?: string[];
}

export interface BulkNotificationRequest {
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
}

export interface BulkNotificationResponse {
  success: boolean;
  batchId: string;
  queuedCount: number;
  summary?: {
    total: number;
    success: number;
    failed: number;
  };
}

// ============================================
// Provider Types
// ============================================
export interface EmailProviderConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface WhatsAppProviderConfig {
  authKey: string;
  templateNamespace: string;
  integratedNumber: string;
}

export interface ProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// ============================================
// Provider Failure Tracking
// ============================================
export interface ProviderFailure {
  provider: string;
  failureCount: number;
  lastFailureAt: Date;
  isCircuitOpen: boolean;
}
