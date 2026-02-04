/**
 * Storage Worker - IndexedDB Operations
 *
 * This worker handles all IndexedDB operations in a background thread
 * to prevent blocking the main UI thread.
 */

const DB_NAME = "PagarbookStorage";
const DB_VERSION = 1;

// ============================================================================
// Database Setup
// ============================================================================

let db = null;

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Users store
      if (!database.objectStoreNames.contains("users")) {
        const usersStore = database.createObjectStore("users", {
          keyPath: "id",
        });
        usersStore.createIndex("by-email", "email", { unique: true });
      }

      // Attendance store
      if (!database.objectStoreNames.contains("attendance")) {
        const attendanceStore = database.createObjectStore("attendance", {
          keyPath: "id",
        });
        attendanceStore.createIndex("by-user", "userId", { unique: false });
        attendanceStore.createIndex("by-date", "attendanceDate", {
          unique: false,
        });
        attendanceStore.createIndex(
          "by-user-date",
          ["userId", "attendanceDate"],
          { unique: true },
        );
      }

      // Salaries store
      if (!database.objectStoreNames.contains("salaries")) {
        const salariesStore = database.createObjectStore("salaries", {
          keyPath: "id",
        });
        salariesStore.createIndex("by-user", "userId", { unique: false });
        salariesStore.createIndex("by-month-year", ["month", "year"], {
          unique: false,
        });
      }

      // Cache store
      if (!database.objectStoreNames.contains("cache")) {
        const cacheStore = database.createObjectStore("cache", {
          keyPath: "key",
        });
        cacheStore.createIndex("by-expires", "expiresAt", { unique: false });
      }
    };
  });
}

async function ensureDB() {
  if (!db) {
    await openDB();
  }
  return db;
}

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleGet(store, key) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readonly");
    const objectStore = transaction.objectStore(store);
    const request = objectStore.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function handleGetAll(store) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readonly");
    const objectStore = transaction.objectStore(store);
    const request = objectStore.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function handlePut(store, value, key) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readwrite");
    const objectStore = transaction.objectStore(store);

    let request;
    if (key) {
      request = objectStore.put({ ...value, id: key });
    } else {
      request = objectStore.put(value);
    }

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function handlePutBatch(store, values) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readwrite");
    const objectStore = transaction.objectStore(store);

    let count = 0;
    transaction.oncomplete = () => resolve({ success: true, count });
    transaction.onerror = () => reject(transaction.error);

    values.forEach((value) => {
      const request = objectStore.put(value);
      request.onsuccess = () => {
        count++;
      };
    });
  });
}

async function handleDelete(store, key) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readwrite");
    const objectStore = transaction.objectStore(store);
    const request = objectStore.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function handleClear(store) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readwrite");
    const objectStore = transaction.objectStore(store);
    const request = objectStore.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function handleCount(store) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readonly");
    const objectStore = transaction.objectStore(store);
    const request = objectStore.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function handleGetByIndex(store, indexName, indexValue) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readonly");
    const objectStore = transaction.objectStore(store);
    const index = objectStore.index(indexName);

    let request;
    if (Array.isArray(indexValue)) {
      request = index.getAll(IDBKeyRange.bound(indexValue[0], indexValue[1]));
    } else {
      request = index.getAll(indexValue);
    }

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function handleGetAllByIndex(store, indexName, indexValue) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readonly");
    const objectStore = transaction.objectStore(store);
    const index = objectStore.index(indexName);

    let request;
    if (Array.isArray(indexValue)) {
      request = index.getAll(IDBKeyRange.bound(indexValue[0], indexValue[1]));
    } else {
      request = index.getAll(indexValue);
    }

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function handleClearExpired(store) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readwrite");
    const objectStore = transaction.objectStore(store);
    const index = objectStore.index("by-expires");
    const now = Date.now();

    let deleted = 0;
    const range = IDBKeyRange.upperBound(now, true);

    const request = index.openKeyCursor(range);

    transaction.oncomplete = () => resolve({ deleted });
    transaction.onerror = () => reject(transaction.error);

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        objectStore.delete(cursor.primaryKey);
        deleted++;
        cursor.continue();
      }
    };
  });
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event) => {
  const { id, type, store, key, value, indexName, indexValue } = event.data;

  try {
    let result;

    switch (type) {
      case "get":
        result = await handleGet(store, key);
        break;
      case "getAll":
        result = await handleGetAll(store);
        break;
      case "put":
        result = await handlePut(store, value, key);
        break;
      case "putBatch":
        result = await handlePutBatch(store, value);
        break;
      case "delete":
        result = await handleDelete(store, key);
        break;
      case "clear":
        result = await handleClear(store);
        break;
      case "count":
        result = await handleCount(store);
        break;
      case "getByIndex":
        result = await handleGetByIndex(store, indexName, indexValue);
        break;
      case "getAllByIndex":
        result = await handleGetAllByIndex(store, indexName, indexValue);
        break;
      case "clearExpired":
        result = await handleClearExpired(store);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    self.postMessage({ id, success: true, data: result });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message || String(error),
    });
  }
};

// Initialize database on worker load
openDB().catch(console.error);
