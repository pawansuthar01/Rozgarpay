/**
 * Enhanced QueryClient Configuration
 *
 * Production-grade React Query configuration with:
 * - Persistent caching (offline support)
 * - Request deduplication
 * - Automatic retry with exponential backoff
 * - Performance monitoring
 * - Optimized stale times based on data volatility
 *
 * Performance targets:
 * - Query duration < 700ms
 * - Cache hit rate > 80%
 * - Error rate < 1%
 */

import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query";

// Define Persister type locally since it's not exported
interface Persister {
  persistClient: (client: Record<string, unknown>) => Promise<void>;
  restoreClient: () => Promise<Record<string, unknown> | undefined>;
  removeClient: () => Promise<void>;
}

import { performanceMonitor } from "./performanceMonitor";

// ============================================================================
// Configuration Constants
// ============================================================================

// Cache persistence keys
const PERSIST_KEY = "pagarbook-query-cache";
const PERSIST_MAX_SIZE = 5 * 1024 * 1024; // 5MB limit

// Default stale times based on data volatility (in milliseconds)
export const STALE_TIMES = {
  // High volatility - changes frequently
  notifications: 30_000, // 30 seconds

  // Medium volatility - changes occasionally
  dashboard: 120_000, // 2 minutes
  attendance: 120_000, // 2 minutes
  todayAttendance: 60_000, // 1 minute

  // Low volatility - changes rarely
  users: 300_000, // 5 minutes
  userDetails: 300_000, // 5 minutes
  companySettings: 600_000, // 10 minutes

  // Very low volatility - reference data
  salarySetup: 600_000, // 10 minutes
  reports: 300_000, // 5 minutes

  // Financial data - needs freshness but not too frequent
  cashbook: 30_000, // 30 seconds
  cashbookBalance: 30_000, // 30 seconds
} as const;

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

// ============================================================================
// LocalStorage Persister (for browser persistence)
// ============================================================================

function createLocalStoragePersister(): Persister {
  return {
    persistClient: async (client: Record<string, unknown>) => {
      try {
        // Only persist if we're in browser
        if (typeof window === "undefined") return;

        const serialized = JSON.stringify(client);
        localStorage.setItem(PERSIST_KEY, serialized);

        // Check size and prune if needed
        if (serialized.length > PERSIST_MAX_SIZE) {
          pruneOldQueries(client);
        }
      } catch (error) {
        console.warn("Failed to persist query cache:", error);
      }
    },
    restoreClient: async () => {
      try {
        if (typeof window === "undefined") return undefined;

        const serialized = localStorage.getItem(PERSIST_KEY);
        if (!serialized) return undefined;

        return JSON.parse(serialized);
      } catch (error) {
        console.warn("Failed to restore query cache:", error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        if (typeof window === "undefined") return;
        localStorage.removeItem(PERSIST_KEY);
      } catch (error) {
        console.warn("Failed to remove query cache:", error);
      }
    },
  };
}

// Prune old queries when cache is too large
function pruneOldQueries(client: Record<string, unknown>) {
  try {
    const cache = client.queries as
      | Array<{
          queryKey: string[];
          state: { data?: unknown; updatedAt: number };
        }>
      | undefined;

    if (!cache) return;

    // Sort by updated time and remove oldest until under limit
    const sorted = cache.sort(
      (a, b) => (a.state.updatedAt || 0) - (b.state.updatedAt || 0),
    );

    // Keep most recent queries (last 50)
    const toRemove = sorted.slice(0, Math.max(0, sorted.length - 50));

    client.queries = cache.filter(
      (q) =>
        !toRemove.some(
          (r) => JSON.stringify(r.queryKey) === JSON.stringify(q.queryKey),
        ),
    );
  } catch (error) {
    console.warn("Failed to prune old queries:", error);
  }
}

// ============================================================================
// Query Client Factory
// ============================================================================

function createQueryClientImpl() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time - will be overridden by individual query options
        staleTime: STALE_TIMES.dashboard,

        // Cache garbage collection time
        gcTime: 10 * 60 * 1000, // 10 minutes

        // Retry configuration with exponential backoff
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && error.message.includes("4")) {
            return false;
          }
          return failureCount < RETRY_CONFIG.maxRetries;
        },
        retryDelay: (attemptIndex) => {
          const delay =
            RETRY_CONFIG.baseDelay *
            Math.pow(RETRY_CONFIG.backoffMultiplier, attemptIndex);
          return Math.min(delay, RETRY_CONFIG.maxDelay);
        },

        // Don't refetch on window focus by default (user engagement aware)
        refetchOnWindowFocus: false,

        // Background refetch interval (disabled by default)
        refetchInterval: false,

        // Don't refetch on reconnect by default
        refetchOnReconnect: "always",

        // Support concurrent queries
        structuralSharing: true,

        // Track query metrics
        queryKeyHashFn: (queryKey) => {
          // Use stable hash for complex keys
          return JSON.stringify(queryKey);
        },
      },
      mutations: {
        retry: 1,
        // Optimistic update retry - quick
        retryDelay: 500,
      },
      dehydrate: {
        // Serialize with optimizations
        serializeData: (data) => {
          try {
            return JSON.stringify(data);
          } catch {
            return null;
          }
        },
        // Include these properties in dehydration
        shouldDehydrateQuery: (query) => {
          return (
            defaultShouldDehydrateQuery(query) && query.state.status !== "error"
          );
        },
      },
    },
  });

  return queryClient;
}

// ============================================================================
// Query Client Creation (Singleton for SSR, new for each browser instance)
// ============================================================================

let browserQueryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // Server-side: create new client per request
    return createQueryClientImpl();
  }

  // Browser: use singleton
  if (!browserQueryClient) {
    browserQueryClient = createQueryClientImpl();

    // Setup persistence (only in browser)
    if (typeof window !== "undefined") {
      setupPersistence(browserQueryClient);
    }
  }

  return browserQueryClient;
}

// ============================================================================
// Persistence Setup
// ============================================================================

function setupPersistence(queryClient: QueryClient) {
  try {
    const persister = createLocalStoragePersister();

    // Custom persistence helper
    const persistCache = async () => {
      const cache = queryClient.getQueryCache().findAll();
      const dehydrated = {
        queries: cache.map((query) => ({
          queryKey: query.queryKey,
          state: query.state,
        })),
      };
      await persister.persistClient(dehydrated as Record<string, unknown>);
    };

    // Restore on load
    const restoreCache = async () => {
      const restored = await persister.restoreClient();
      if (restored) {
        try {
          (
            restored.queries as Array<{
              queryKey: unknown[];
              state: { data?: unknown; error?: Error };
            }>
          ).forEach((query) => {
            if (query.state.data !== undefined) {
              queryClient.setQueryData(query.queryKey, query.state.data);
            }
          });
        } catch (error) {
          console.warn("Failed to restore query cache:", error);
        }
      }
    };

    // Initial restore
    restoreCache();

    // Setup listeners for cache updates
    if (typeof window !== "undefined") {
      // Persist on page unload
      window.addEventListener("beforeunload", persistCache);

      // Periodic persist (every 30 seconds)
      const persistInterval = setInterval(persistCache, 30000);

      // Cleanup on unmount would require cleanup function return
      // For now, we rely on beforeunload
    }
  } catch (error) {
    console.warn("Failed to setup query persistence:", error);
  }
}

// ============================================================================
// Performance Monitoring Integration
// ============================================================================

// Track query performance metrics
export function trackQueryPerformance(
  queryKey: readonly string[],
  duration: number,
  status: "success" | "error",
  isCacheHit: boolean,
): void {
  performanceMonitor.recordQueryMetric({
    queryKey: Array.isArray(queryKey) ? queryKey.join(".") : String(queryKey),
    duration,
    status,
    isCacheHit,
    timestamp: Date.now(),
  });
}

// Create a monitored query function
export function createMonitoredQueryFn<T>(
  queryFn: () => Promise<T>,
  queryKey: string[],
): () => Promise<T> {
  return async () => {
    const startTime = performance.now();
    let isCacheHit = false;

    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;

      trackQueryPerformance(queryKey, duration, "success", isCacheHit);

      // Log slow queries (> 700ms)
      if (duration > 700) {
        console.warn(
          `Slow query detected: ${queryKey.join(".")} took ${duration.toFixed(2)}ms`,
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackQueryPerformance(queryKey, duration, "error", isCacheHit);
      throw error;
    }
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

// Prefetch data for anticipated user actions
export async function prefetchQuery<T>(
  queryClient: QueryClient,
  queryKey: string[],
  queryFn: () => Promise<T>,
  staleTime: number = STALE_TIMES.dashboard,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime,
  });
}

// Invalidate related queries efficiently
export function invalidateRelatedQueries(
  queryClient: QueryClient,
  baseKey: string,
  excludeKeys: string[] = [],
): void {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [key] = query.queryKey;
      if (key !== baseKey) return false;

      const fullKey = query.queryKey.join(".");
      return !excludeKeys.some((ex) => fullKey.includes(ex));
    },
  });
}

// ============================================================================
// API Fetch Wrapper with Performance Tracking
// ============================================================================

export async function fetchWithMonitoring<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const startTime = performance.now();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      // Request compression
      "Accept-Encoding": "gzip, deflate",
    },
  });

  const duration = performance.now() - startTime;

  // Log API call performance
  performanceMonitor.recordAPIMetric({
    url,
    method: options?.method || "GET",
    duration,
    status: response.status,
    timestamp: Date.now(),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Export QueryClient instance getter
// ============================================================================

export { browserQueryClient };
