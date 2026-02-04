/**
 * Optimized Salary Hook
 *
 * Performance optimizations:
 * - Optimized stale times
 * - Performance monitoring integration
 * - Placeholder data for smooth loading
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { performanceMonitor } from "@/lib/performanceMonitor";
import { SalaryRecord, SalaryApiResponse } from "@/types/salary";

// ============================================================================
// Stale Times
// ============================================================================

const STALE_TIMES = {
  LIST: 1000 * 60 * 2, // 2 minutes
  DETAIL: 1000 * 60 * 5, // 5 minutes
  REPORTS: 1000 * 60 * 5, // 5 minutes
} as const;

// ============================================================================
// Hooks
// ============================================================================

export function useSalaries(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  month?: number;
  year?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["salaries", "list", params] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.userId) searchParams.set("userId", String(params.userId));
      if (params?.month) searchParams.set("month", String(params.month));
      if (params?.year) searchParams.set("year", String(params.year));
      if (params?.status) searchParams.set("status", String(params.status));
      if (params?.search) searchParams.set("search", String(params.search));

      const response = await fetch(`/api/admin/salary?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch salaries");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "salaries.list",
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

export function useGenerateSalaries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate salaries");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
    },
  });
}

export function useSalary(salaryId: string) {
  return useQuery({
    queryKey: ["salary", "detail", salaryId] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const response = await fetch(`/api/admin/salary/${salaryId}`);
      if (!response.ok) throw new Error("Failed to fetch salary");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "salaries.detail",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    enabled: !!salaryId,
    staleTime: STALE_TIMES.DETAIL,
  });
}

export function useApproveSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salaryId: string) => {
      const response = await fetch(`/api/admin/salary/${salaryId}/approve`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve salary");
      }
      return response.json();
    },
    onSuccess: (_, salaryId) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({
        queryKey: ["salary", "detail", salaryId],
      });
    },
  });
}

export function useRejectSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salaryId: string) => {
      const response = await fetch(`/api/admin/salary/${salaryId}/reject`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject salary");
      }
      return response.json();
    },
    onSuccess: (_, salaryId) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({
        queryKey: ["salary", "detail", salaryId],
      });
    },
  });
}

export function useMarkSalaryPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      salaryId,
      paymentData,
    }: {
      salaryId: string;
      paymentData: any;
    }) => {
      const response = await fetch(`/api/admin/salary/${salaryId}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark salary as paid");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({
        queryKey: ["salary", "detail", variables.salaryId],
      });
    },
  });
}

export function useRecalculateSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salaryId: string) => {
      const response = await fetch(
        `/api/admin/salary/${salaryId}/recalculate`,
        { method: "POST" },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to recalculate salary");
      }
      return response.json();
    },
    onSuccess: (_, salaryId) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({
        queryKey: ["salary", "detail", salaryId],
      });
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const response = await fetch(`/api/admin/users/${userId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add payment");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({
        queryKey: ["userProfile", variables.userId],
      });
    },
  });
}

export function useRecoverPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const response = await fetch(
        `/api/admin/users/${userId}/recover-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to recover payment");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({
        queryKey: ["userProfile", variables.userId],
      });
    },
  });
}

export function useAddDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const response = await fetch(`/api/admin/users/${userId}/deductions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add deduction");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({
        queryKey: ["userProfile", variables.userId],
      });
    },
  });
}

export function useSalaryReports(params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["salary", "reports", params] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.startDate)
        searchParams.set("startDate", String(params.startDate));
      if (params?.endDate) searchParams.set("endDate", String(params.endDate));
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const response = await fetch(`/api/admin/reports/salary?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch salary reports");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "salary.reports",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    staleTime: STALE_TIMES.REPORTS,
  });
}

export function useSalarySlipDownload() {
  return useMutation({
    mutationFn: async ({
      year,
      month,
      type,
    }: {
      year: number;
      month: number;
      type: "full" | "summary";
    }) => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        type,
      });
      const res = await fetch(`/api/staff/salary-slips/generate?${params}`);
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType?.includes("pdf")) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to generate PDF");
      }
      const blob = await res.blob();
      return new File([blob], `${type}-salary-slip-${month}-${year}.pdf`, {
        type: "application/pdf",
      });
    },
  });
}

export function useGenerateSalaryReport() {
  return useMutation({
    mutationFn: async ({ format }: { format?: string }) => {
      const response = await fetch("/api/staff/salary/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: format || "pdf" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate report");
      }
      return response.blob();
    },
  });
}
