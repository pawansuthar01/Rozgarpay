import { openDB, DBSchema, IDBPDatabase } from "idb";

interface PayrollDB extends DBSchema {
  users: {
    key: string;
    value: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      role: string;
      status: string;
      lastUpdated: number;
    };
  };
  attendance: {
    key: string;
    value: {
      id: string;
      userId: string;
      attendanceDate: string;
      punchInTime?: string;
      punchOutTime?: string;
      status: string;
      totalHours?: number;
      lastUpdated: number;
    };
    indexes: { "by-user": string; "by-date": string };
  };
  salaries: {
    key: string;
    value: {
      id: string;
      userId: string;
      month: number;
      year: number;
      netSalary: number;
      status: string;
      lastUpdated: number;
    };
    indexes: { "by-user": string; "by-month-year": [number, number] };
  };
  cache: {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
      expiresAt?: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<PayrollDB>>;

function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<PayrollDB>("payrollbook", 1, {
      upgrade(db) {
        // Users store
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "id" });
        }

        // Attendance store with indexes
        if (!db.objectStoreNames.contains("attendance")) {
          const attendanceStore = db.createObjectStore("attendance", {
            keyPath: "id",
          });
          attendanceStore.createIndex("by-user", "userId");
          attendanceStore.createIndex("by-date", "attendanceDate");
        }

        // Salaries store with indexes
        if (!db.objectStoreNames.contains("salaries")) {
          const salaryStore = db.createObjectStore("salaries", {
            keyPath: "id",
          });
          salaryStore.createIndex("by-user", "userId");
          salaryStore.createIndex("by-month-year", ["month", "year"]);
        }

        // Cache store for general caching
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// Generic cache operations
export async function setCache(key: string, data: any, ttl?: number) {
  const db = await initDB();
  const expiresAt = ttl ? Date.now() + ttl : undefined;

  await db.put("cache", {
    key,
    data,
    timestamp: Date.now(),
    expiresAt,
  });
}

export async function getCache(key: string) {
  const db = await initDB();
  const item = await db.get("cache", key);

  if (!item) return null;

  // Check if expired
  if (item.expiresAt && Date.now() > item.expiresAt) {
    await db.delete("cache", key);
    return null;
  }

  return item.data;
}

export async function clearExpiredCache() {
  const db = await initDB();
  const tx = db.transaction("cache", "readwrite");
  const store = tx.objectStore("cache");

  const now = Date.now();
  let cursor = await store.openCursor();

  while (cursor) {
    if (cursor.value.expiresAt && now > cursor.value.expiresAt) {
      cursor.delete();
    }
    cursor = await cursor.continue();
  }

  await tx.done;
}

// User storage operations
export async function saveUsers(users: any[]) {
  const db = await initDB();
  const tx = db.transaction("users", "readwrite");

  for (const user of users) {
    await tx.store.put({
      ...user,
      lastUpdated: Date.now(),
    });
  }

  await tx.done;
}

export async function getUsers() {
  const db = await initDB();
  return await db.getAll("users");
}

export async function getUser(userId: string) {
  const db = await initDB();
  return await db.get("users", userId);
}

// Attendance storage operations
export async function saveAttendance(attendance: any[]) {
  const db = await initDB();
  const tx = db.transaction("attendance", "readwrite");

  for (const record of attendance) {
    await tx.store.put({
      ...record,
      lastUpdated: Date.now(),
    });
  }

  await tx.done;
}

export async function getAttendanceByUser(userId: string) {
  const db = await initDB();
  return await db.getAllFromIndex("attendance", "by-user", userId);
}

export async function getAttendanceByDate(date: string) {
  const db = await initDB();
  return await db.getAllFromIndex("attendance", "by-date", date);
}

// Salary storage operations
export async function saveSalaries(salaries: any[]) {
  const db = await initDB();
  const tx = db.transaction("salaries", "readwrite");

  for (const salary of salaries) {
    await tx.store.put({
      ...salary,
      lastUpdated: Date.now(),
    });
  }

  await tx.done;
}

export async function getSalariesByUser(userId: string) {
  const db = await initDB();
  return await db.getAllFromIndex("salaries", "by-user", userId);
}

export async function getSalariesByMonthYear(month: number, year: number) {
  const db = await initDB();
  return await db.getAllFromIndex("salaries", "by-month-year", [month, year]);
}

// Sync utilities
export async function syncDataWithAPI(endpoint: string, data: any) {
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const apiData = await response.json();

      // Store in IndexedDB based on endpoint
      if (endpoint.includes("/users")) {
        await saveUsers(apiData.users || [apiData]);
      } else if (endpoint.includes("/attendance")) {
        await saveAttendance(apiData.attendance || [apiData]);
      } else if (endpoint.includes("/salary")) {
        await saveSalaries(apiData.salaries || [apiData]);
      }

      return apiData;
    }
  } catch (error) {
    console.error("Sync failed:", error);
  }

  return null;
}

// localStorage utilities for simple key-value data
export const localStorageUtil = {
  set: (key: string, value: any) => {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  },

  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue || null;
      return JSON.parse(item);
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return defaultValue || null;
    }
  },

  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing from localStorage:", error);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  },
};

// sessionStorage utilities for temporary session data
export const sessionStorageUtil = {
  set: (key: string, value: any) => {
    try {
      const serializedValue = JSON.stringify(value);
      sessionStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error("Error saving to sessionStorage:", error);
    }
  },

  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = sessionStorage.getItem(key);
      if (item === null) return defaultValue || null;
      return JSON.parse(item);
    } catch (error) {
      console.error("Error reading from sessionStorage:", error);
      return defaultValue || null;
    }
  },

  remove: (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing from sessionStorage:", error);
    }
  },

  clear: () => {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error("Error clearing sessionStorage:", error);
    }
  },
};

// Specific storage keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: "user_preferences",
  THEME: "theme",
  LANGUAGE: "language",
  LAST_LOGIN: "last_login",
  FORM_DRAFTS: "form_drafts",
  OFFLINE_QUEUE: "offline_queue",
} as const;

// User preferences (localStorage)
export function saveUserPreferences(preferences: Record<string, any>) {
  localStorageUtil.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
}

export function getUserPreferences() {
  return localStorageUtil.get(STORAGE_KEYS.USER_PREFERENCES, {});
}

export function saveTheme(theme: string) {
  localStorageUtil.set(STORAGE_KEYS.THEME, theme);
}

export function getTheme() {
  return localStorageUtil.get(STORAGE_KEYS.THEME, "light");
}

// Form drafts (sessionStorage)
export function saveFormDraft(formId: string, data: any) {
  const drafts = sessionStorageUtil.get<Record<string, any>>(
    STORAGE_KEYS.FORM_DRAFTS,
    {},
  );
  if (drafts) {
    drafts[formId] = { ...data, timestamp: Date.now() };
    sessionStorageUtil.set(STORAGE_KEYS.FORM_DRAFTS, drafts);
  }
}

export function getFormDraft(formId: string) {
  const drafts = sessionStorageUtil.get<Record<string, any>>(
    STORAGE_KEYS.FORM_DRAFTS,
    {},
  );
  return drafts ? drafts[formId] || null : null;
}

export function clearFormDraft(formId: string) {
  const drafts = sessionStorageUtil.get<Record<string, any>>(
    STORAGE_KEYS.FORM_DRAFTS,
    {},
  );
  if (drafts) {
    delete drafts[formId];
    sessionStorageUtil.set(STORAGE_KEYS.FORM_DRAFTS, drafts);
  }
}

// Offline queue for failed requests
export function addToOfflineQueue(request: {
  id: string;
  url: string;
  method: string;
  body?: any;
  timestamp: number;
}) {
  const queue = localStorageUtil.get<Array<typeof request>>(
    STORAGE_KEYS.OFFLINE_QUEUE,
    [],
  );
  if (queue) {
    queue.push(request);
    localStorageUtil.set(STORAGE_KEYS.OFFLINE_QUEUE, queue);
  }
}

export function getOfflineQueue(): Array<{
  id: string;
  url: string;
  method: string;
  body?: any;
  timestamp: number;
}> {
  return localStorageUtil.get(STORAGE_KEYS.OFFLINE_QUEUE, []) || [];
}

export function removeFromOfflineQueue(requestId: string) {
  const queue = localStorageUtil.get<Array<{ id: string }>>(
    STORAGE_KEYS.OFFLINE_QUEUE,
    [],
  );
  if (queue) {
    const filteredQueue = queue.filter((req) => req.id !== requestId);
    localStorageUtil.set(STORAGE_KEYS.OFFLINE_QUEUE, filteredQueue);
  }
}

export function clearOfflineQueue() {
  localStorageUtil.remove(STORAGE_KEYS.OFFLINE_QUEUE);
}

// Offline detection
export function isOnline(): boolean {
  return navigator.onLine;
}

export function addOnlineListener(callback: (online: boolean) => void) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
