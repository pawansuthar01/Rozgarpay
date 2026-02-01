import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "next-auth";

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
    queryKey: ["users", page, limit, status, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status,
        search,
      });

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch users");
      }
      return res.json();
    },
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
    onSuccess: () => {
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
    queryKey: ["userData", userId],
    queryFn: async (): Promise<User> => {
      const response = await fetch(`/api/admin/users/${userId}/data`);
      if (!response.ok) {
        throw new Error("Failed to fetch salary report");
      }
      const { data } = await response.json();
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}
