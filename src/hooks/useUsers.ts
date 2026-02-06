import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const STALE_TIMES = {
  LIST: 1000 * 60 * 1, // 1 minute
  DETAIL: 1000 * 60 * 5,
} as const;

export function useUsers(
  page: number,
  limit: number,
  status: string,
  search: string,
) {
  const queryClient = useQueryClient();

  // Prefetch first page for instant load
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["users", "list", 1, limit, status, ""] as const,
      queryFn: () =>
        fetch(`/api/admin/users?page=1&limit=${limit}&status=${status}`).then(
          (r) => r.json(),
        ),
      staleTime: STALE_TIMES.LIST,
    });
  }, [limit, status, queryClient]);

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["users", "list", page, limit, status, search] as const,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status,
        search,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
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
      newStatus: string;
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const users = data?.users || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const updateStatus = (userId: string, newStatus: string) =>
    mutation.mutateAsync({ userId, newStatus });

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
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${userId}/data`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!userId,
  });
}
