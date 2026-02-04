import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { performanceMonitor } from "@/lib/performanceMonitor";

export interface CorrectionRequest {
  id: string;
  attendanceDate: string;
  type:
    | "MISSED_PUNCH_IN"
    | "MISSED_PUNCH_OUT"
    | "ATTENDANCE_MISS"
    | "LEAVE_REQUEST"
    | "SUPPORT_REQUEST"
    | "SALARY_REQUEST";
  reason: string;
  endDate: string;
  reviewReason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedTime?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface UseCorrectionRequestsOptions {
  isAdmin?: boolean;
  filters?: {
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
  };
  pagination?: {
    page?: number;
    limit?: number;
  };
}

export function useCorrectionRequests(
  options: UseCorrectionRequestsOptions = {},
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["correction-requests", options],
    queryFn: async () => {
      const startTime = performance.now();
      const endpoint = options.isAdmin
        ? "/api/correction-requests"
        : "/api/staff/correction-requests";

      const params = new URLSearchParams();
      if (options.filters?.status)
        params.append("status", options.filters.status);
      if (options.filters?.type) params.append("type", options.filters.type);
      if (options.filters?.startDate)
        params.append("startDate", options.filters.startDate);
      if (options.filters?.endDate)
        params.append("endDate", options.filters.endDate);
      if (options.filters?.userId)
        params.append("userId", options.filters.userId);
      if (options.pagination?.page)
        params.append("page", options.pagination.page.toString());
      if (options.pagination?.limit)
        params.append("limit", options.pagination.limit.toString());

      try {
        const res = await fetch(`${endpoint}?${params}`);
        if (!res.ok) {
          throw new Error("Failed to fetch correction requests");
        }
        const data = await res.json();

        performanceMonitor.recordQueryMetric({
          queryKey: "correction-requests.list",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data.correctionRequests || [];
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "correction-requests.list",
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const submitMutation = useMutation({
    mutationFn: async (formData: {
      attendanceDate: string;
      type: string;
      requestedTime?: string;
      reason: string;
      evidence?: string;
    }) => {
      const res = await fetch("/api/staff/correction-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["correction-requests"] });
    },
  });

  const handleMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      approvedTime,
      reviewReason,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
      approvedTime?: string;
      reviewReason?: string;
    }) => {
      const res = await fetch("/api/correction-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, approvedTime, reviewReason }),
      });

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["correction-requests"] });
    },
  });

  return {
    requests: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    fetchRequests: query.refetch,
    submitRequest: submitMutation.mutateAsync,
    handleAction: handleMutation.mutateAsync,
  };
}
