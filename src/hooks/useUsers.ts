/**
 * Optimized Users Hook
 *
 * Performance optimizations:
 * - Optimized stale times
 * - Performance monitoring integration
 * - Placeholder data for smooth loading
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "next-auth";
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

export function useUsers(
  page: number,
  limit: number,
  status: string,
  search: string,
) {
  const queryClient = useQueryClient();

  const {
    data: usersData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["users", "list", page, limit, status, search] as const,
    queryFn: async () => {
      const startTime = performance.now();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status,
        search,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch users");
      }
      const data = await res.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "users.list",
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

  const mutation = useMutation({
    mutationFn: async ({
      userId,
      newStatus,
    }: {
      userId: string;
      newStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["usersStats"] });
    },
  });

  const users = usersData?.users || [];
  const totalPages = usersData?.pagination?.totalPages || 1;

  const updateStatus = (
    userId: string,
    newStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED",
  ) => {
    return mutation.mutateAsync({ userId, newStatus });
  };

  return {
    users,
    loading,
    error: error?.message || null,
    totalPages,
    updateStatus,
  };
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["user", "detail", userId] as const,
    queryFn: async (): Promise<User> => {
      const startTime = performance.now();
      const response = await fetch(`/api/admin/users/${userId}/data`);
      if (!response.ok) throw new Error("Failed to fetch user");
      const { data } = await response.json();
      performanceMonitor.recordQueryMetric({
        queryKey: "users.detail",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      return data;
    },
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!userId,
  });
}
