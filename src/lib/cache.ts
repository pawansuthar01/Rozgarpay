// Simple in-memory cache for API responses
// For production, replace with Redis

interface CacheEntry {
  data: any;
  timestamp: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL = 60000; // 60 seconds

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.defaultTTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set(key: string, data: any, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  invalidate(pattern: string): void {
    // Simple pattern matching - in production use Redis for better patterns
    this.cache.forEach((_, key) => {
      if (key.includes(pattern.split("*")[0])) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new MemoryCache();

// Cache key generators
export const cacheKeys = {
  dashboard: (companyId: string) => `dashboard:${companyId}`,
  attendance: (companyId: string, page: number, filters: string) =>
    `attendance:${companyId}:${page}:${filters}`,
  salary: (companyId: string, page: number, filters: string) =>
    `salary:${companyId}:${page}:${filters}`,
  reports: (companyId: string, type: string, filters: string) =>
    `reports:${companyId}:${type}:${filters}`,
};

// Helper to create cacheable API handlers
export function withCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = 30000,
): Promise<T> {
  const cached = apiCache.get<T>(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return fetchFn().then((data) => {
    apiCache.set(cacheKey, data, ttlMs);
    return data;
  });
}
