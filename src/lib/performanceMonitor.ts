/**
 * Performance Monitor
 *
 * Comprehensive performance tracking for React Query including:
 * - Query duration tracking
 * - Cache hit rates
 * - Error rates
 * - User-perceived latency
 * - Performance budgets with alerting
 *
 * Performance targets:
 * - Query duration < 700ms
 * - Cache hit rate > 80%
 * - Error rate < 1%
 */

interface QueryMetric {
  queryKey: string;
  duration: number;
  status: "success" | "error";
  isCacheHit: boolean;
  timestamp: number;
}

interface APIMetric {
  url: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
}

interface PerformanceSummary {
  avgQueryDuration: number;
  p95QueryDuration: number;
  cacheHitRate: number;
  errorRate: number;
  totalQueries: number;
  slowQueries: number;
}

// Performance budget thresholds
const BUDGET_THRESHOLDS = {
  maxQueryDuration: 700, // 700ms target
  minCacheHitRate: 0.8, // 80% target
  maxErrorRate: 0.01, // 1% target
};

// ============================================================================
// Performance Monitor Class
// ============================================================================

class PerformanceMonitor {
  private queryMetrics: QueryMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private maxMetricsStored = 1000;
  private alertCallback:
    | ((message: string, severity: "warning" | "error") => void)
    | null = null;

  constructor() {
    // Cleanup old metrics periodically
    if (typeof window !== "undefined") {
      setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
    }
  }

  // ============================================================================
  // Metrics Recording
  // ============================================================================

  recordQueryMetric(metric: QueryMetric): void {
    this.queryMetrics.push(metric);

    // Check budget thresholds
    this.checkBudgetThresholds(metric);

    // Cleanup if too many metrics
    if (this.queryMetrics.length > this.maxMetricsStored) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsStored);
    }
  }

  recordAPIMetric(metric: APIMetric): void {
    this.apiMetrics.push(metric);

    if (this.apiMetrics.length > this.maxMetricsStored) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetricsStored);
    }
  }

  // ============================================================================
  // Budget Monitoring
  // ============================================================================

  setAlertCallback(
    callback: (message: string, severity: "warning" | "error") => void,
  ): void {
    this.alertCallback = callback;
  }

  private checkBudgetThresholds(metric: QueryMetric): void {
    // Check query duration
    if (metric.duration > BUDGET_THRESHOLDS.maxQueryDuration) {
      this.emitAlert(
        `Slow query: ${metric.queryKey} took ${metric.duration.toFixed(2)}ms (target: ${BUDGET_THRESHOLDS.maxQueryDuration}ms)`,
        "warning",
      );
    }

    // Check error rate periodically
    if (this.queryMetrics.length % 50 === 0) {
      const summary = this.getSummary();

      if (summary.errorRate > BUDGET_THRESHOLDS.maxErrorRate) {
        this.emitAlert(
          `High error rate detected: ${(summary.errorRate * 100).toFixed(2)}% (target: ${BUDGET_THRESHOLDS.maxErrorRate * 100}%)`,
          "error",
        );
      }

      if (summary.cacheHitRate < BUDGET_THRESHOLDS.minCacheHitRate) {
        this.emitAlert(
          `Low cache hit rate: ${(summary.cacheHitRate * 100).toFixed(2)}% (target: ${BUDGET_THRESHOLDS.minCacheHitRate * 100}%)`,
          "warning",
        );
      }
    }
  }

  private emitAlert(message: string, severity: "warning" | "error"): void {
    console.warn(`[Performance Alert] ${severity.toUpperCase()}: ${message}`);

    if (this.alertCallback) {
      this.alertCallback(message, severity);
    }

    // In production, you might send this to a monitoring service
    if (severity === "error") {
      // Don't log errors in production to avoid noise
      if (process.env.NODE_ENV === "development") {
        console.error(message);
      }
    }
  }

  // ============================================================================
  // Metrics Retrieval
  // ============================================================================

  getQueryMetrics(): QueryMetric[] {
    return [...this.queryMetrics];
  }

  getAPIMetrics(): APIMetric[] {
    return [...this.apiMetrics];
  }

  getSummary(): PerformanceSummary {
    const totalQueries = this.queryMetrics.length;

    if (totalQueries === 0) {
      return {
        avgQueryDuration: 0,
        p95QueryDuration: 0,
        cacheHitRate: 0,
        errorRate: 0,
        totalQueries: 0,
        slowQueries: 0,
      };
    }

    // Calculate average duration
    const durations = this.queryMetrics.map((m) => m.duration);
    const avgQueryDuration =
      durations.reduce((a, b) => a + b, 0) / totalQueries;

    // Calculate P95 duration
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(totalQueries * 0.95);
    const p95QueryDuration = sortedDurations[p95Index] || 0;

    // Calculate cache hit rate
    const cacheHits = this.queryMetrics.filter((m) => m.isCacheHit).length;
    const cacheHitRate = cacheHits / totalQueries;

    // Calculate error rate
    const errors = this.queryMetrics.filter((m) => m.status === "error").length;
    const errorRate = errors / totalQueries;

    // Count slow queries
    const slowQueries = this.queryMetrics.filter(
      (m) => m.duration > BUDGET_THRESHOLDS.maxQueryDuration,
    ).length;

    return {
      avgQueryDuration,
      p95QueryDuration,
      cacheHitRate,
      errorRate,
      totalQueries,
      slowQueries,
    };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Remove metrics older than 1 hour
    this.queryMetrics = this.queryMetrics.filter(
      (m) => m.timestamp > oneHourAgo,
    );
    this.apiMetrics = this.apiMetrics.filter((m) => m.timestamp > oneHourAgo);
  }

  clear(): void {
    this.queryMetrics = [];
    this.apiMetrics = [];
  }

  // ============================================================================
  // Performance Testing Utilities
  // ============================================================================

  // Simulate a query and return performance metrics
  async measureQuery<T>(
    queryKey: string[],
    queryFn: () => Promise<T>,
    isCacheHit: boolean = false,
  ): Promise<{ data: T; metrics: QueryMetric }> {
    const startTime = performance.now();

    try {
      const data = await queryFn();
      const duration = performance.now() - startTime;

      const metric: QueryMetric = {
        queryKey: queryKey.join("."),
        duration,
        status: "success",
        isCacheHit,
        timestamp: Date.now(),
      };

      this.recordQueryMetric(metric);

      return { data, metrics: metric };
    } catch (error) {
      const duration = performance.now() - startTime;

      const metric: QueryMetric = {
        queryKey: queryKey.join("."),
        duration,
        status: "error",
        isCacheHit,
        timestamp: Date.now(),
      };

      this.recordQueryMetric(metric);

      throw error;
    }
  }

  // Generate performance report
  generateReport(): string {
    const summary = this.getSummary();

    return `
Performance Report
==================
Generated: ${new Date().toISOString()}

Query Statistics:
- Total Queries: ${summary.totalQueries}
- Average Duration: ${summary.avgQueryDuration.toFixed(2)}ms
- P95 Duration: ${summary.p95QueryDuration.toFixed(2)}ms
- Slow Queries: ${summary.slowQueries}

Budget Status:
- Cache Hit Rate: ${(summary.cacheHitRate * 100).toFixed(2)}% ${
      summary.cacheHitRate >= BUDGET_THRESHOLDS.minCacheHitRate ? "✅" : "⚠️"
    }
- Error Rate: ${(summary.errorRate * 100).toFixed(2)}% ${
      summary.errorRate <= BUDGET_THRESHOLDS.maxErrorRate ? "✅" : "⚠️"
    }
- Query Duration: ${summary.p95QueryDuration.toFixed(2)}ms ${
      summary.p95QueryDuration <= BUDGET_THRESHOLDS.maxQueryDuration
        ? "✅"
        : "⚠️"
    }
`.trim();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// React Hook for Performance Monitoring
// ============================================================================

export function usePerformanceSummary() {
  const summary = performanceMonitor.getSummary();

  return {
    ...summary,
    isWithinBudget:
      summary.cacheHitRate >= BUDGET_THRESHOLDS.minCacheHitRate &&
      summary.errorRate <= BUDGET_THRESHOLDS.maxErrorRate &&
      summary.p95QueryDuration <= BUDGET_THRESHOLDS.maxQueryDuration,
  };
}

export function usePerformanceReport() {
  return performanceMonitor.generateReport();
}
