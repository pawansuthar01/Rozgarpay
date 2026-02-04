# Performance Optimization Documentation

This document describes the comprehensive React Query performance optimizations implemented to achieve consistent load times under 700ms.

## Overview

The optimization effort addresses performance bottlenecks across multiple layers:

- **Query Management**: Centralized, typed query keys
- **Data Persistence**: Web Workers for non-blocking IndexedDB operations
- **API Optimization**: Response compression and selective field fetching
- **Pagination**: Virtualization and optimized pagination patterns
- **Caching**: Advanced staleTime configuration and query persistence
- **Monitoring**: Comprehensive performance tracking

## Performance Budget

| Metric              | Target  | Current Baseline |
| ------------------- | ------- | ---------------- |
| Query Duration      | < 700ms | 2-3s             |
| Cache Hit Rate      | > 80%   | Unknown          |
| Error Rate          | < 1%    | Unknown          |
| Time to Interactive | < 1s    | Unknown          |

---

## 1. Query Key Management

### Centralized Query Key Factory

Located at: `src/lib/queryKeys.ts`

The query key factory provides:

- **Type-safe** query keys preventing cache fragmentation
- **Hierarchical** structure for precise invalidation
- **Serializable** keys for consistent caching

```typescript
// Before (inconsistent keys)
queryKey: ["attendance", params];
queryKey: ["manager", "attendance", params];
queryKey: ["users", page, limit, status, search];

// After (centralized factory)
import { attendanceKeys, usersKeys } from "@/lib/queryKeys";

// Type-safe, consistent keys
queryKey: attendanceKeys.lists(params);
queryKey: usersKeys.list(page, limit, status, search);
```

### Key Structure

Each factory follows this pattern:

- `all` - Base key for the entity
- `lists(params)` - List queries with filters
- `details(id)` - Single entity queries
- `stats()` - Aggregate statistics

---

## 2. Web Worker for IndexedDB

### Storage Worker

Located at: `src/workers/storage.worker.ts`

Moves all IndexedDB operations off the main thread:

```typescript
// Before (blocking main thread)
await saveAttendance(records); // Blocks UI during large writes

// After (non-blocking via worker)
import { storageWorker } from "@/lib/storageWorker";
await storageWorker.saveAttendance(records); // Runs in background
```

### Features

- **Priority Queue**: High, normal, and low priority operations
- **Batch Operations**: Efficient bulk inserts
- **Request Queuing**: Prevents UI freeze during heavy operations
- **Error Handling**: Proper promise-based error propagation

---

## 3. Enhanced QueryClient Configuration

Located at: `src/lib/queryClient.ts`

### StaleTime Configuration

Data volatility-based stale times:

```typescript
export const STALE_TIMES = {
  // High volatility (30s)
  notifications: 30_000,

  // Medium volatility (1-2 min)
  todayAttendance: 60_000,
  dashboard: 120_000,
  attendance: 120_000,

  // Low volatility (5 min)
  users: 300_000,
  userDetails: 300_000,
  reports: 300_000,

  // Very low volatility (10 min)
  companySettings: 600_000,
  salarySetup: 600_000,

  // Financial data (30s)
  cashbook: 30_000,
  cashbookBalance: 30_000,
};
```

### Retry with Exponential Backoff

```typescript
retry: (failureCount, error) => {
  if (error.message.includes('4')) return false; // No retry on 4xx
  return failureCount < 3;
},
retryDelay: (attemptIndex) => {
  const baseDelay = 1000;
  const multiplier = 2;
  return Math.min(baseDelay * Math.pow(multiplier, attemptIndex), 30000);
},
```

### Persistent Caching

```typescript
// Cache persists across sessions (7 days max)
persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

---

## 4. Optimistic Updates

All mutations include optimistic updates with rollback:

```typescript
export function usePunchAttendance() {
  return useMutation({
    mutationFn: punchAttendanceAPI,
    onMutate: async (newPunch) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["attendance", "today"] });

      // Snapshot previous value
      const previousToday = queryClient.getQueryData(["attendance", "today"]);

      // Optimistically update
      queryClient.setQueryData(["attendance", "today"], (old) => ({
        ...old,
        hasPunchedIn: true,
      }));

      return { previousToday };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousToday) {
        queryClient.setQueryData(
          ["attendance", "today"],
          context.previousToday,
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["attendance", "today"] });
    },
  });
}
```

---

## 5. Performance Monitoring

Located at: `src/lib/performanceMonitor.ts`

### Metrics Tracked

- Query duration (avg, p95)
- Cache hit rates
- Error rates
- Slow query detection (>700ms)
- API call performance

### Alert System

```typescript
const BUDGET_THRESHOLDS = {
  maxQueryDuration: 700, // ms
  minCacheHitRate: 0.8, // 80%
  maxErrorRate: 0.01, // 1%
};
```

---

## 6. API Optimizations

### Response Compression

Enable on Next.js API routes:

```typescript
// next.config.js
module.exports = {
  compress: true,
  experimental: {
    optimizeCss: true,
  },
};
```

### Selective Field Fetching

Request only needed fields:

```typescript
// API route optimization
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fields = searchParams.get("fields");

  const select = fields
    ? fields.split(",").reduce((acc, field) => ({ ...acc, [field]: true }), {})
    : undefined;

  const records = await prisma.attendance.findMany({
    select, // Only fetch requested fields
    take: limit,
  });
}
```

---

## 7. Pagination Optimization

### Cursor-based Pagination (Recommended)

```typescript
// Instead of offset-based (slow for large datasets)
skip: (page - 1) * limit,

// Use cursor-based (efficient)
cursor: lastItemId,
take: limit,
```

### Virtualization

For large lists (100+ items), use `react-window`:

```typescript
import { FixedSizeList } from 'react-window';

function AttendanceList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <AttendanceItem item={items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

---

## 8. Backend Optimizations

### Database Indexing

```prisma
// Add indexes for frequently queried fields
model Attendance {
  id              String   @id @default(cuid())
  userId          String
  attendanceDate  DateTime

  @@index([userId])
  @@index([attendanceDate])
  @@index([userId, attendanceDate]) // Composite index
}

model Salary {
  id        String   @id @default(cuid())
  userId    String
  month     Int
  year      Int

  @@index([userId])
  @@index([month, year])
}
```

### Connection Pooling

```typescript
// lib/prisma.ts
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  __internal: {
    engine: {
      connector: {
        pool: {
          min: 2,
          max: 10,
        },
      },
    },
  },
});
```

---

## 9. Testing Strategy

### Performance Testing

```typescript
// __tests__/performance.test.ts
describe("Performance", () => {
  it("should load attendance under 700ms", async () => {
    const start = performance.now();

    const { data } = await queryClient.fetchQuery({
      queryKey: attendanceKeys.lists({ page: 1, limit: 10 }),
      queryFn: fetchAttendance,
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(700);
  });

  it("should have cache hit rate above 80%", () => {
    const summary = performanceMonitor.getSummary();
    expect(summary.cacheHitRate).toBeGreaterThan(0.8);
  });
});
```

### Load Testing

```bash
# Use k6 or similar for load testing
k6 run --vus 10 --duration 30s performance-test.js
```

---

## 10. Migration Guide

### Step 1: Install Dependencies

```bash
npm install @tanstack/react-query @tanstack/query-sync-storage-persister
```

### Step 2: Update Providers

```typescript
// src/components/providers.tsx
import { Providers } from "@/components/providers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 3: Update Hooks

```typescript
// src/hooks/useAttendance.ts
import { useQuery } from "@tanstack/react-query";
import { attendanceKeys } from "@/lib/queryKeys";

export function useAttendance(params) {
  return useQuery({
    queryKey: attendanceKeys.lists(params),
    queryFn: () => fetchAttendance(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
```

### Step 4: Add Monitoring

```typescript
// In development, log performance
useEffect(() => {
  if (process.env.NODE_ENV === "development") {
    const summary = performanceMonitor.getSummary();
    console.log("Performance:", summary);
  }
}, []);
```

---

## Expected Improvements

| Metric              | Before   | After   | Improvement |
| ------------------- | -------- | ------- | ----------- |
| First Paint         | 2-3s     | < 500ms | 4-6x faster |
| Time to Interactive | 3-4s     | < 800ms | 4-5x faster |
| API Response Time   | 500ms-1s | < 200ms | 3-5x faster |
| Cache Hit Rate      | Unknown  | > 80%   | Significant |
| Offline Support     | Partial  | Full    | Complete    |

---

## Monitoring & Alerting

### Real-time Monitoring

Access performance metrics in development:

```typescript
import { usePerformanceSummary } from "@/lib/performanceMonitor";

function PerformanceWidget() {
  const summary = usePerformanceSummary();

  return (
    <div>
      <div>Query Duration: {summary.avgQueryDuration.toFixed(2)}ms</div>
      <div>Cache Hit Rate: {(summary.cacheHitRate * 100).toFixed(0)}%</div>
      <div>Status: {summary.isWithinBudget ? '✅' : '⚠️'}</div>
    </div>
  );
}
```

### Alert Configuration

Alerts are triggered when:

- Query duration exceeds 700ms
- Cache hit rate drops below 80%
- Error rate exceeds 1%

---

## Conclusion

These optimizations target the 700ms performance goal through:

1. Efficient caching with typed query keys
2. Non-blocking database operations via Web Workers
3. Optimistic updates for instant feedback
4. Comprehensive monitoring for continuous improvement

Regular performance audits and monitoring will ensure sustained performance gains.
