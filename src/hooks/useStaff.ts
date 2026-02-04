/**
 * Optimized Staff Hook
 *
 * Performance optimizations:
 * - Optimized stale times
 * - Performance monitoring integration
 * - Placeholder data for smooth loading
 */

import { useQuery } from "@tanstack/react-query";
import { performanceMonitor } from "@/lib/performanceMonitor";

// ============================================================================
// Stale Times
// ============================================================================

const STALE_TIMES = {
  LIST: 1000 * 60 * 2, // 2 minutes
  DETAIL: 1000 * 60 * 5, // 5 minutes
} as const;

// ============================================================================
// Hooks
// ============================================================================

export function useStaff(params?: {
  page?: number;
  limit?: number;
  status?: string;
  attendanceStatus?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["staff", "list", params] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.status) searchParams.set("status", String(params.status));
      if (params?.attendanceStatus)
        searchParams.set("attendanceStatus", String(params.attendanceStatus));
      if (params?.search) searchParams.set("search", String(params.search));

      const response = await fetch(`/api/admin/staff?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch staff");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "staff.list",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    staleTime: STALE_TIMES.LIST,
    placeholderData: (previousData) => previousData,
  });
}

export function useStaffDetail(staffId: string) {
  return useQuery({
    queryKey: ["staff", "detail", staffId] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const response = await fetch(`/api/admin/staff/${staffId}`);
      if (!response.ok) throw new Error("Failed to fetch staff detail");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "staff.detail",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    enabled: !!staffId,
    staleTime: STALE_TIMES.DETAIL,
  });
}

export function useStaffSalaries(params?: { month?: number; year?: number }) {
  return useQuery({
    queryKey: ["staff", "salaries", params] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.month) searchParams.set("month", String(params.month));
      if (params?.year) searchParams.set("year", String(params.year));

      const response = await fetch(`/api/staff/salary?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch staff salaries");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "staff.salaries",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    staleTime: STALE_TIMES.LIST,
  });
}

export function useStaffSalaryOverview() {
  return useQuery({
    queryKey: ["staff", "salary", "overview"] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const response = await fetch("/api/staff/salary/overview");
      if (!response.ok)
        throw new Error("Failed to fetch staff salary overview");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "staff.salary.overview",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    staleTime: STALE_TIMES.LIST,
  });
}

export function useStaffAttendance(params?: {
  staffId: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["staff", "attendance", params?.staffId, params] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.startDate)
        searchParams.set("startDate", String(params.startDate));
      if (params?.endDate) searchParams.set("endDate", String(params.endDate));

      const response = await fetch(`/api/staff/attendance?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch staff attendance");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "staff.attendance",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    staleTime: STALE_TIMES.LIST,
    enabled: !!params?.staffId,
  });
}
