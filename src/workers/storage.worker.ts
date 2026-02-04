/**
 * IndexedDB Web Worker
 *
 * Moves all IndexedDB operations off the main thread to prevent
 * UI blocking during heavy read/write operations.
 *
 * Features:
 * - Async/await pattern for all operations
 * - Request queuing with priority levels
 * - Batch operations support
 * - Error handling with proper message passing
 */

/// <reference lib="webworker" />

// ============================================================================
// Types
// ============================================================================

type OperationType =
  | "init"
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
// IndexedDB Helper (Native API without idb library)
// ============================================================================

async function openDB(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains("users")) {
        const usersStore = db.createObjectStore("users", { keyPath: "id" });
        usersStore.createIndex("by-email", "email");
      }

      if (!db.objectStoreNames.contains("attendance")) {
        const attendanceStore = db.createObjectStore("attendance", {
          keyPath: "id",
        });
        attendanceStore.createIndex("by-user", "userId");
        attendanceStore.createIndex("by-date", "attendanceDate");
      }

      if (!db.objectStoreNames.contains("salaries")) {
        const salaryStore = db.createObjectStore("salaries", { keyPath: "id" });
        salaryStore.createIndex("by-user", "userId");
        salaryStore.createIndex("by-month-year", ["month", "year"]);
      }

      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("offlineQueue")) {
        db.createObjectStore("offlineQueue", { keyPath: "id" });
      }
    };
  });
}

async function dbGet(
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAll(
  db: IDBDatabase,
  storeName: string,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut(
  db: IDBDatabase,
  storeName: string,
  value: unknown,
  key?: IDBValidKey,
): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = key ? store.put(value, key) : store.put(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbClear(db: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbCount(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetByIndex(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  value: IDBValidKey,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.get(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAllByIndex(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  value: IDBValidKey | IDBKeyRange,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbClearExpired(
  db: IDBDatabase,
  storeName: string,
): Promise<{ deleted: number }> {
  const now = Date.now();
  let deleted = 0;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (cursor) {
        const value = cursor.value as { expiresAt?: number };
        if (value.expiresAt && now > value.expiresAt) {
          cursor.delete();
          deleted++;
        }
        cursor.continue();
      } else {
        resolve({ deleted });
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Priority Queue
// ============================================================================

type QueuedRequest = {
  request: StorageRequest;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

class PriorityQueue {
  private queues: Map<string, QueuedRequest[]> = new Map();
  private isProcessing = false;
  private db: IDBDatabase | null = null;

  constructor() {
    this.queues.set("high", []);
    this.queues.set("normal", []);
    this.queues.set("low", []);
  }

  async ensureDB() {
    if (!this.db) {
      this.db = await openDB("payrollbook", 1);
    }
    return this.db;
  }

  enqueue(
    request: StorageRequest,
    resolve: (value: unknown) => void,
    reject: (error: Error) => void,
  ) {
    const priority = request.priority || "normal";
    const queue = this.queues.get(priority)!;
    queue.push({ request, resolve, reject });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const db = await this.ensureDB();
    const priorities = ["high", "normal", "low"] as const;

    for (const priority of priorities) {
      const queue = this.queues.get(priority)!;

      while (queue.length > 0) {
        const { request, resolve, reject } = queue.shift()!;

        try {
          const result = await this.executeRequest(db, request);
          resolve(result);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    this.isProcessing = false;
  }

  private async executeRequest(
    db: IDBDatabase,
    request: StorageRequest,
  ): Promise<unknown> {
    switch (request.type) {
      case "get":
        if (!request.key) throw new Error("Key required for get operation");
        return dbGet(db, request.store, request.key);

      case "getAll":
        return dbGetAll(db, request.store);

      case "put":
        if (!request.value) throw new Error("Value required for put operation");
        return dbPut(db, request.store, request.value, request.key);

      case "putBatch":
        if (!Array.isArray(request.value))
          throw new Error("Batch must be an array");
        for (const item of request.value) {
          await dbPut(db, request.store, item);
        }
        return { success: true, count: request.value.length };

      case "delete":
        if (!request.key) throw new Error("Key required for delete operation");
        return dbDelete(db, request.store, request.key);

      case "clear":
        return dbClear(db, request.store);

      case "count":
        return dbCount(db, request.store);

      case "getByIndex":
        if (!request.indexName || request.indexValue === undefined) {
          throw new Error("Index name and value required for getByIndex");
        }
        return dbGetByIndex(
          db,
          request.store,
          request.indexName,
          request.indexValue,
        );

      case "getAllByIndex":
        if (!request.indexName)
          throw new Error("Index name required for getAllByIndex");
        return dbGetAllByIndex(
          db,
          request.store,
          request.indexName,
          request.indexValue!,
        );

      case "clearExpired":
        return dbClearExpired(db, request.store);

      default:
        throw new Error(`Unknown operation type: ${request.type}`);
    }
  }
}

// ============================================================================
// Request Handler
// ============================================================================

const queue = new PriorityQueue();

async function handleRequest(
  request: StorageRequest,
): Promise<StorageResponse> {
  return new Promise((resolve) => {
    queue.enqueue(
      request,
      (data) => resolve({ id: request.id, success: true, data }),
      (error) =>
        resolve({ id: request.id, success: false, error: error.message }),
    );
  });
}

// ============================================================================
// Worker Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<StorageRequest>) => {
  try {
    const response = await handleRequest(event.data);
    self.postMessage(response);
  } catch (error) {
    self.postMessage({
      id: event.data.id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export {};
