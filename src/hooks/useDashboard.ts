/**
 * Optimized Dashboard Hook
 *
 * Performance optimizations:
 * - Optimized stale times
 * - Performance monitoring integration
 * - Placeholder data for smooth loading
 * - Prefetching support
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { performanceMonitor } from "@/lib/performanceMonitor";

// ============================================================================
// Stale Times
// ============================================================================

const STALE_TIMES = {
  STATS: 1000 * 60 * 2, // 2 minutes
  RECENT_ACTIVITY: 1000 * 60 * 2, // 2 minutes
  AUDIT_LOGS: 1000 * 60 * 2, // 2 minutes
} as const;

// ============================================================================
// Query Options
// ============================================================================

export const dashboardStatsOptions = queryOptions({
  queryKey: ["dashboard", "stats"] as const,
  queryFn: async () => {
    const startTime = performance.now();
    const response = await fetch("/api/admin/dashboard");
    if (!response.ok) throw new Error("Failed to fetch dashboard stats");

    const data = await response.json();
    performanceMonitor.recordQueryMetric({
      queryKey: "dashboard.stats",
      duration: performance.now() - startTime,
      status: "success",
      isCacheHit: false,
      timestamp: Date.now(),
    });

    // Transform API response to match dashboard page expectations
    return {
      staffCount: data.staffCount ?? 0,
      attendance: {
        approved: data.attendance?.approved ?? 0,
        absent: data.attendance?.absent ?? 0,
        pending: data.attendance?.pending ?? 0,
      },
      monthlySalaryTotal: data.monthlySalaryTotal ?? 0,
      cashbookBalance: data.cashbookBalance ?? 0,
    };
  },
  staleTime: STALE_TIMES.STATS,
  gcTime: 1000 * 60 * 10,
});

// ============================================================================
// Hooks
// ============================================================================

export function useDashboardStats() {
  return useQuery(dashboardStatsOptions);
}

// Prefetch helper for admin layout
export async function prefetchAdminDashboard(queryClient: any) {
  return queryClient.prefetchQuery(dashboardStatsOptions);
}

// ============================================================================
// Recent Activity Hook (Separate Fetch)
// ============================================================================

const PLACEHOLDER_RECENT_ACTIVITY: any[] = [];

export const recentActivityOptions = queryOptions({
  queryKey: ["dashboard", "recent-activity"] as const,
  queryFn: async () => {
    const startTime = performance.now();
    const response = await fetch("/api/admin/recent-activity");
    if (!response.ok) throw new Error("Failed to fetch recent activity");

    const data = await response.json();
    performanceMonitor.recordQueryMetric({
      queryKey: "dashboard.recent-activity",
      duration: performance.now() - startTime,
      status: "success",
      isCacheHit: false,
      timestamp: Date.now(),
    });

    return data.logs || [];
  },
  staleTime: STALE_TIMES.RECENT_ACTIVITY,
  gcTime: 1000 * 60 * 5,
  placeholderData: PLACEHOLDER_RECENT_ACTIVITY,
});

export function useRecentActivity() {
  return useQuery(recentActivityOptions);
}

export function useAuditLogs(params?: {
  page?: number;
  limit?: number;
  filter?: string;
}) {
  return useQuery({
    queryKey: ["dashboard", "audit-logs", params] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.filter) searchParams.set("filter", String(params.filter));

      const response = await fetch(`/api/admin/audit-logs?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "dashboard.audit-logs",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });

      return data;
    },
    staleTime: STALE_TIMES.AUDIT_LOGS,
    placeholderData: (previousData) => previousData,
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to complete onboarding");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
