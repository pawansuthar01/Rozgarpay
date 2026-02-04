import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsKeys } from "@/lib/queryKeys";
import { performanceMonitor } from "@/lib/performanceMonitor";

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Placeholder data for smooth loading
const PLACEHOLDER_NOTIFICATIONS = {
  notifications: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

// Query: Get notifications
export function useNotifications(params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}) {
  return useQuery({
    queryKey: notificationsKeys.lists(params),
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.isRead !== undefined)
        searchParams.set("isRead", params.isRead.toString());

      try {
        const response = await fetch(
          `/api/admin/notifications?${searchParams}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }
        const data = (await response.json()) as NotificationsResponse;

        performanceMonitor.recordQueryMetric({
          queryKey: "notifications.list",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "notifications.list",
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 1, // 1 minute - notifications change frequently
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    placeholderData: PLACEHOLDER_NOTIFICATIONS,
  });
}

// Query: Get staff notifications
export function useStaffNotifications(params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}) {
  return useQuery({
    queryKey: ["staff", "notifications", "list", params],
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.isRead !== undefined)
        searchParams.set("isRead", params.isRead.toString());

      try {
        const response = await fetch(
          `/api/staff/notifications?${searchParams}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch staff notifications");
        }
        const data = (await response.json()) as NotificationsResponse;

        performanceMonitor.recordQueryMetric({
          queryKey: "staff.notifications.list",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "staff.notifications.list",
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    placeholderData: PLACEHOLDER_NOTIFICATIONS,
  });
}

// Mutation: Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(
        `/api/staff/notifications/${notificationId}/read`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark notification as read");
      }

      return response.json() as Promise<Notification>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["staff", "notifications"] });
    },
  });
}

// Mutation: Create notification
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      title: string;
      message: string;
      type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
    }) => {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create notification");
      }

      return response.json() as Promise<Notification>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["staff", "notifications"] });
    },
  });
}
