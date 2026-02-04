/**
 * Centralized Query Key Factory
 *
 * Provides typed, stable query keys to prevent cache fragmentation
 * and unnecessary refetches. Keys are structured hierarchically
 * and only invalidate when specific underlying data changes.
 *
 * Performance benefits:
 * - Stable serializable keys prevent cache misses
 * - Hierarchical structure enables precise cache invalidation
 * - Type safety prevents key-related bugs
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type QueryKey = ReadonlyArray<unknown>;

export interface QueryKeyFactory {
  all: QueryKey;
  lists: (filters?: Record<string, unknown>) => QueryKey;
  details: (id: string) => QueryKey;
}

// ============================================================================
// Base Query Keys
// ============================================================================

export const queryKeys = {
  users: ["users"] as const,
  attendance: ["attendance"] as const,
  salary: ["salary"] as const,
  cashbook: ["cashbook"] as const,
  dashboard: ["dashboard"] as const,
  notifications: ["notifications"] as const,
  invitations: ["invitations"] as const,
  company: ["company"] as const,
  reports: ["reports"] as const,
  staff: ["staff"] as const,
  auth: ["auth"] as const,
} as const;

// ============================================================================
// Users Keys
// ============================================================================

export const usersKeys = {
  all: ["users"] as const,

  lists: (filters?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    role?: string;
  }) => ["users", "list", filters] as const,

  list: (page: number, limit: number, status: string, search: string) =>
    ["users", "list", page, limit, status, search] as const,

  details: (userId: string) => ["users", "detail", userId] as const,

  stats: () => ["users", "stats"] as const,

  attendance: (userId: string) => ["users", "attendance", userId] as const,

  reports: (userId: string) => ["users", "reports", userId] as const,
};

// ============================================================================
// Attendance Keys
// ============================================================================

export const attendanceKeys = {
  all: ["attendance"] as const,

  lists: (filters?: {
    page?: number;
    limit?: number;
    userId?: string;
    date?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => ["attendance", "list", filters] as const,

  list: (params?: Record<string, unknown>) =>
    ["attendance", "list", params] as const,

  details: (attendanceId: string) =>
    ["attendance", "detail", attendanceId] as const,

  today: () => ["attendance", "today"] as const,

  reports: (filters?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => ["attendance", "reports", filters] as const,

  missing: (filters?: { date?: string; page?: number; limit?: number }) =>
    ["attendance", "missing", filters] as const,

  manager: (filters?: {
    page?: number;
    limit?: number;
    date?: string;
    status?: string;
    search?: string;
  }) => ["attendance", "manager", filters] as const,
};

// ============================================================================
// Salary Keys
// ============================================================================

export const salaryKeys = {
  all: ["salary"] as const,

  lists: (filters?: {
    page?: number;
    limit?: number;
    userId?: string;
    status?: string;
    month?: number;
    year?: number;
  }) => ["salary", "list", filters] as const,

  details: (salaryId: string) => ["salary", "detail", salaryId] as const,

  reports: (filters?: {
    userId?: string;
    startMonth?: number;
    startYear?: number;
    endMonth?: number;
    endYear?: number;
  }) => ["salary", "reports", filters] as const,

  slips: (filters?: { userId?: string; month?: number; year?: number }) =>
    ["salary", "slips", filters] as const,
};

// ============================================================================
// Cashbook Keys
// ============================================================================

export const cashbookKeys = {
  all: ["cashbook"] as const,

  lists: (filters?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    transactionType?: string;
    direction?: string;
    paymentMode?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => ["cashbook", "list", filters] as const,

  details: (entryId: string) => ["cashbook", "detail", entryId] as const,

  balance: () => ["cashbook", "balance"] as const,

  reports: (filters?: { dateFrom?: string; dateTo?: string; type?: string }) =>
    ["cashbook", "reports", filters] as const,
};

// ============================================================================
// Dashboard Keys
// ============================================================================

export const dashboardKeys = {
  all: ["dashboard"] as const,

  stats: () => ["dashboard", "stats"] as const,

  auditLogs: (filters?: { page?: number; limit?: number; filter?: string }) =>
    ["dashboard", "audit-logs", filters] as const,
};

// ============================================================================
// Notifications Keys
// ============================================================================

export const notificationsKeys = {
  all: ["notifications"] as const,

  lists: (filters?: {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: string;
  }) => ["notifications", "list", filters] as const,

  unreadCount: () => ["notifications", "unread-count"] as const,
};

// ============================================================================
// Invitations Keys
// ============================================================================

export const invitationsKeys = {
  all: ["invitations"] as const,

  lists: (filters?: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
  }) => ["invitations", "list", filters] as const,
};

// ============================================================================
// Staff Keys
// ============================================================================

export const staffKeys = {
  all: ["staff"] as const,

  lists: (filters?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => ["staff", "list", filters] as const,

  details: (staffId: string) => ["staff", "detail", staffId] as const,

  attendance: (
    staffId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      status?: string;
    },
  ) => ["staff", "attendance", staffId, filters] as const,

  dashboard: (staffId: string) => ["staff", "dashboard", staffId] as const,
};

// ============================================================================
// Reports Keys
// ============================================================================

export const reportsKeys = {
  all: ["reports"] as const,

  attendance: (filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    departmentId?: string;
  }) => ["reports", "attendance", filters] as const,

  salary: (filters?: {
    startMonth?: number;
    startYear?: number;
    endMonth?: number;
    endYear?: number;
    departmentId?: string;
  }) => ["reports", "salary", filters] as const,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a dependent query key that automatically invalidates
 * when the parent key changes
 */
export function createDependentKeys<T extends QueryKey>(
  parentKey: T,
  dependency: unknown,
): [...T, unknown] {
  return [...parentKey, dependency];
}

/**
 * Creates a hash-based cache key for complex objects
 * Ensures consistent key generation for objects with same content
 */
export function createObjectKey<T extends object>(
  obj: T,
  prefix: QueryKey,
): [QueryKey, T] {
  return [prefix, obj];
}

/**
 * Type-safe query key creator for lists
 */
export function createListQueryKey<T extends Record<string, unknown>>(
  baseKey: QueryKey,
  params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: T;
  },
): [QueryKey, typeof params] {
  return [baseKey, params];
}
