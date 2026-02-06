/**
 * Optimized Cashbook Hook
 *
 * Performance optimizations:
 * - Fast stale times for responsive data
 * - Query deduplication
 * - No optimistic updates - wait for API response
 * - Proper loading states
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { performanceMonitor } from "@/lib/performanceMonitor";

// ============================================================================
// Constants & Types
// ============================================================================

const CASHBOOK_LIST_KEY = ["cashbook", "list"] as const;
const CASHBOOK_BALANCE_KEY = ["cashbook", "balance"] as const;

interface CashbookRecord {
  id: string;
  status?: string;
  isReversed?: boolean;
  [key: string]: any;
}

interface CashbookListData {
  entries: CashbookRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats?: {
    currentBalance: number;
    totalCredit: number;
    totalDebit: number;
    monthlyCredit: number;
    monthlyDebit: number;
    transactionCount: number;
  };
  [key: string]: any;
}

// ============================================================================
// Stale Times
// ============================================================================

const STALE_TIMES = {
  LIST: 0, // Always refetch after invalidation
  DETAIL: 1000 * 60, // 2 minutes
  BALANCE: 0, // Always refetch after invalidation
  REPORTS: 1000 * 60, // 5 minutes
} as const;

// ============================================================================
// Hooks
// ============================================================================

export function useCashbook(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  direction?: string;
  paymentMode?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: [...CASHBOOK_LIST_KEY, params] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.sortBy) searchParams.set("sortBy", String(params.sortBy));
      if (params?.sortOrder)
        searchParams.set("sortOrder", String(params.sortOrder));
      if (params?.startDate)
        searchParams.set("startDate", String(params.startDate));
      if (params?.endDate) searchParams.set("endDate", String(params.endDate));
      if (params?.transactionType)
        searchParams.set("transactionType", String(params.transactionType));
      if (params?.direction)
        searchParams.set("direction", String(params.direction));
      if (params?.paymentMode)
        searchParams.set("paymentMode", String(params.paymentMode));
      if (params?.search) searchParams.set("search", String(params.search));

      const startTime = performance.now();
      const response = await fetch(`/api/admin/cashbook?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch cashbook entries");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "cashbook.list",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    staleTime: STALE_TIMES.LIST,
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

export function useCashbookBalance() {
  return useQuery({
    queryKey: CASHBOOK_BALANCE_KEY,
    queryFn: async () => {
      const startTime = performance.now();
      const response = await fetch("/api/admin/cashbook/balance");
      if (!response.ok) throw new Error("Failed to fetch cashbook balance");

      const data = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "cashbook.balance",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    staleTime: STALE_TIMES.BALANCE,
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

export function useCreateCashbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/cashbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create cashbook entry");
      }
      return response.json();
    },
    // Wait for API response, then refresh data
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CASHBOOK_LIST_KEY });
      await queryClient.invalidateQueries({ queryKey: CASHBOOK_BALANCE_KEY });
    },
  });
}

export function useCashbookEntry(entryId: string) {
  return useQuery({
    queryKey: ["cashbook", "detail", entryId] as const,
    queryFn: async () => {
      const response = await fetch(`/api/admin/cashbook/${entryId}`);
      if (!response.ok) throw new Error("Failed to fetch cashbook entry");
      return response.json();
    },
    enabled: !!entryId,
    staleTime: STALE_TIMES.DETAIL,
  });
}

export function useUpdateCashbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, data }: { entryId: string; data: any }) => {
      const response = await fetch(`/api/admin/cashbook/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update cashbook entry");
      }
      return response.json();
    },
    // Wait for API response, then refresh data including linked user
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: CASHBOOK_LIST_KEY });
      // If entry is linked to a user, invalidate that user's queries too
      if (result?.entry?.userId) {
        await queryClient.invalidateQueries({
          queryKey: ["user", result.entry.userId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["salary", "user", result.entry.userId],
        });
      }
      await queryClient.invalidateQueries({ queryKey: CASHBOOK_BALANCE_KEY });
    },
  });
}

export function useDeleteCashbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      // First fetch the entry to get userId before deleting
      const entryResponse = await fetch(`/api/admin/cashbook/${entryId}`);
      let userId = null;
      if (entryResponse.ok) {
        const entryData = await entryResponse.json();
        userId = entryData.entry?.userId;
      }

      const response = await fetch(`/api/admin/cashbook/${entryId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete cashbook entry");
      }
      return { userId };
    },
    // Wait for API response, then refresh data including linked user
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: CASHBOOK_LIST_KEY });
      await queryClient.invalidateQueries({ queryKey: CASHBOOK_BALANCE_KEY });
      // If entry was linked to a user, invalidate that user's queries too
      if (result?.userId) {
        await queryClient.invalidateQueries({
          queryKey: ["user", result.userId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["salary", "user", result.userId],
        });
      }
    },
  });
}

export function useReverseCashbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      reason,
    }: {
      entryId: string;
      reason: string;
    }) => {
      const response = await fetch(`/api/admin/cashbook/${entryId}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Failed to reverse entry" }));
        throw new Error(error.error || "Failed to reverse entry");
      }
      return response.json();
    },
    // Wait for API response, then refresh data
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CASHBOOK_LIST_KEY });
      await queryClient.invalidateQueries({ queryKey: CASHBOOK_BALANCE_KEY });
    },
  });
}

export function useCashbookReports(params?: {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: ["cashbook", "reports", params] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.dateFrom)
        searchParams.set("dateFrom", String(params.dateFrom));
      if (params?.dateTo) searchParams.set("dateTo", String(params.dateTo));
      if (params?.type) searchParams.set("type", String(params.type));
      const response = await fetch(
        `/api/admin/cashbook/reports?${searchParams}`,
      );
      if (!response.ok) throw new Error("Failed to fetch cashbook reports");
      return response.json();
    },
    staleTime: STALE_TIMES.REPORTS,
  });
}

export function useGenerateCashbookPDF() {
  return useMutation({
    mutationFn: async (params: any) => {
      const searchParams = new URLSearchParams({ format: "pdf" });
      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      if (params.transactionType)
        searchParams.set("transactionType", params.transactionType);
      if (params.direction) searchParams.set("direction", params.direction);
      if (params.paymentMode)
        searchParams.set("paymentMode", params.paymentMode);
      if (params.search) searchParams.set("search", params.search);

      const response = await fetch(
        `/api/admin/cashbook/reports?${searchParams}`,
      );
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cashbook-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return { success: true };
    },
  });
}
