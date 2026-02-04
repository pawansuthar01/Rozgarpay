import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invitationsKeys } from "@/lib/queryKeys";
import { performanceMonitor } from "@/lib/performanceMonitor";

interface Invitation {
  id: string;
  email: string;
  token: string;
  phone: string;
  role: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
  status: "pending" | "completed" | "expired";
}

interface InvitationsResponse {
  invitations: Invitation[];
  stats: {
    total: number;
    pending: number;
    completed: number;
    expired: number;
    roleDistribution: Record<string, number>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query: Get invitations
export function useInvitations(params?: {
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: invitationsKeys.lists(params),
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.status) searchParams.set("status", params.status);
      if (params?.role) searchParams.set("role", params.role);
      if (params?.search) searchParams.set("search", params.search);

      try {
        const response = await fetch(`/api/invitations?${searchParams}`);
        if (!response.ok) {
          throw new Error("Failed to fetch invitations");
        }
        const data = (await response.json()) as InvitationsResponse;

        // Record performance metric
        performanceMonitor.recordQueryMetric({
          queryKey: "invitations.list",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "invitations.list",
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - low volatility data
    gcTime: 1000 * 60 * 30, // 30 minutes cache
  });
}

// Mutation: Create invitation
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      phone: string;
      role: string;
      sendWelcome: boolean;
    }) => {
      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invitation");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationsKeys.all });
    },
  });
}

// Mutation: Delete invitation
export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete invitation");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationsKeys.all });
    },
  });
}
