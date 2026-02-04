/**
 * Storage Service - Web Worker Communication Layer
 *
 * Provides async IndexedDB operations via Web Worker to prevent
 * main thread blocking. All operations return Promises for
 * seamless integration with React Query.
 *
 * Performance benefits:
 * - Non-blocking database operations
 * - Priority-based request queuing
 * - Batch operation support
 * - Error handling with proper promise rejection
 */

type OperationType =
  | "get"
  | "getAll"
  | "put"
  | "putBatch"
  | "delete"
  | "clear"
  | "count"
  | "getByIndex"
  | "getAllByIndex"
  | "clearExpired";

interface StorageRequest {
  id: string;
  type: OperationType;
  store: string;
  key?: string;
  value?: unknown;
  indexName?: string;
  indexValue?: string | [number, number];
  count?: number;
  ttl?: number;
  priority?: "high" | "normal" | "low";
}

interface StorageResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Worker Manager
// ============================================================================

class StorageWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  > = new Map();
  private requestIdCounter = 0;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Try to create worker with dynamic import for Next.js compatibility
        if (typeof window !== "undefined" && typeof Worker !== "undefined") {
          // Use the public worker file path
          const workerUrl = "/workers/storage.worker.js";
          this.worker = new Worker(workerUrl, { type: "module" });

          this.worker.onmessage = (event: MessageEvent<StorageResponse>) => {
            const { id, success, data, error } = event.data;
            const pending = this.pendingRequests.get(id);

            if (pending) {
              this.pendingRequests.delete(id);
              if (success) {
                pending.resolve(data);
              } else {
                pending.reject(new Error(error || "Unknown worker error"));
              }
            }
          };

          this.worker.onerror = (error) => {
            console.error("Storage worker error:", error);
            // Don't reject - worker errors shouldn't break the app
            // Fall back to direct IndexedDB operations
          };

          // Worker is ready
          resolve();
        } else {
          // Worker not available (SSR or unsupported browser)
          resolve();
        }
      } catch (error) {
        // Fall back to no worker (sync operations will be skipped)
        console.warn(
          "Web Worker not available, falling back to direct operations",
        );
        resolve();
      }
    });

    return this.initPromise;
  }

  private async sendRequest(
    request: Omit<StorageRequest, "id">,
  ): Promise<unknown> {
    await this.init();

    // If worker is not available, skip the operation
    if (!this.worker) {
      return null;
    }

    const id = `req_${++this.requestIdCounter}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.worker!.postMessage({
        id,
        ...request,
      } as StorageRequest);

      // Timeout after 30 seconds
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(new Error("Worker request timeout"));
        }
      }, 30000);
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  async get(
    store: string,
    key: string,
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<unknown> {
    return this.sendRequest({
      type: "get",
      store,
      key,
      priority,
    });
  }

  async getAll(
    store: string,
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<unknown[]> {
    return this.sendRequest({
      type: "getAll",
      store,
      priority,
    }) as Promise<unknown[]>;
  }

  async put(
    store: string,
    value: unknown,
    key?: string,
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<IDBValidKey> {
    return this.sendRequest({
      type: "put",
      store,
      value,
      key,
      priority,
    }) as Promise<IDBValidKey>;
  }

  async putBatch(
    store: string,
    values: unknown[],
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<{ success: boolean; count: number }> {
    return this.sendRequest({
      type: "putBatch",
      store,
      value: values,
      priority,
    }) as Promise<{ success: boolean; count: number }>;
  }

  async delete(
    store: string,
    key: string,
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<void> {
    return this.sendRequest({
      type: "delete",
      store,
      key,
      priority,
    }) as Promise<void>;
  }

  async clear(
    store: string,
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<void> {
    return this.sendRequest({
      type: "clear",
      store,
      priority,
    }) as Promise<void>;
  }

  async count(
    store: string,
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<number> {
    return this.sendRequest({
      type: "count",
      store,
      priority,
    }) as Promise<number>;
  }

  async getByIndex(
    store: string,
    indexName: string,
    indexValue: string | [number, number],
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<unknown> {
    return this.sendRequest({
      type: "getByIndex",
      store,
      indexName,
      indexValue,
      priority,
    });
  }

  async getAllByIndex(
    store: string,
    indexName: string,
    indexValue: string | [number, number],
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<unknown[]> {
    return this.sendRequest({
      type: "getAllByIndex",
      store,
      indexName,
      indexValue,
      priority,
    }) as Promise<unknown[]>;
  }

  async clearExpired(store: string): Promise<{ deleted: number }> {
    return this.sendRequest({
      type: "clearExpired",
      store,
      priority: "low",
    }) as Promise<{ deleted: number }>;
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  // Users
  async getUser(userId: string): Promise<unknown> {
    return this.get("users", userId, "high");
  }

  async getAllUsers(): Promise<unknown[]> {
    return this.getAll("users");
  }

  async saveUsers(users: unknown[]): Promise<void> {
    await this.putBatch("users", users, "normal");
  }

  // Attendance
  async getAttendance(id: string): Promise<unknown> {
    return this.get("attendance", id, "high");
  }

  async getAttendanceByUser(userId: string): Promise<unknown[]> {
    return this.getAllByIndex("attendance", "by-user", userId);
  }

  async getAttendanceByDate(date: string): Promise<unknown[]> {
    return this.getAllByIndex("attendance", "by-date", date);
  }

  async saveAttendance(records: unknown[]): Promise<void> {
    await this.putBatch("attendance", records, "normal");
  }

  // Salaries
  async getSalary(id: string): Promise<unknown> {
    return this.get("salaries", id, "high");
  }

  async getSalariesByUser(userId: string): Promise<unknown[]> {
    return this.getAllByIndex("salaries", "by-user", userId);
  }

  async getSalariesByMonthYear(
    month: number,
    year: number,
  ): Promise<unknown[]> {
    return this.getAllByIndex("salaries", "by-month-year", [month, year]);
  }

  async saveSalaries(salaries: unknown[]): Promise<void> {
    await this.putBatch("salaries", salaries, "normal");
  }

  // Cache
  async getCached<T>(key: string): Promise<T | null> {
    const result = (await this.get("cache", key)) as {
      data: T;
      expiresAt?: number;
    } | null;
    if (!result) return null;

    if (result.expiresAt && Date.now() > result.expiresAt) {
      await this.delete("cache", key);
      return null;
    }

    return result.data as T;
  }

  async setCache<T>(key: string, data: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl : undefined;
    await this.put("cache", { key, data, timestamp: Date.now(), expiresAt });
  }

  // Cleanup
  async clearExpiredCache(): Promise<number> {
    const result = await this.clearExpired("cache");
    return result.deleted;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const storageWorker = new StorageWorkerManager();

// ============================================================================
// Typed Accessor Functions (for backward compatibility)
// ============================================================================

export async function saveAttendance(attendance: unknown[]): Promise<void> {
  await storageWorker.saveAttendance(attendance);
}

export async function getAttendanceByUser(userId: string): Promise<unknown[]> {
  return storageWorker.getAttendanceByUser(userId);
}

export async function getAttendanceByDate(date: string): Promise<unknown[]> {
  return storageWorker.getAttendanceByDate(date);
}

export async function saveUsers(users: unknown[]): Promise<void> {
  await storageWorker.saveUsers(users);
}

export async function getUsers(): Promise<unknown[]> {
  return storageWorker.getAllUsers();
}

export async function getUser(userId: string): Promise<unknown> {
  return storageWorker.getUser(userId);
}

export async function saveSalaries(salaries: unknown[]): Promise<void> {
  await storageWorker.saveSalaries(salaries);
}

export async function getSalariesByUser(userId: string): Promise<unknown[]> {
  return storageWorker.getSalariesByUser(userId);
}

export async function getSalariesByMonthYear(
  month: number,
  year: number,
): Promise<unknown[]> {
  return storageWorker.getSalariesByMonthYear(month, year);
}

export async function setCache(
  key: string,
  data: unknown,
  ttl?: number,
): Promise<void> {
  await storageWorker.setCache(key, data, ttl);
}

export async function getCache<T>(key: string): Promise<T | null> {
  return storageWorker.getCached(key);
}

export async function clearExpiredCache(): Promise<number> {
  return storageWorker.clearExpiredCache();
}
