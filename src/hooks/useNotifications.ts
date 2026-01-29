import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

// Query: Get notifications
export function useNotifications(params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.isRead !== undefined)
        searchParams.set("isRead", params.isRead.toString());

      const response = await fetch(`/api/admin/notifications?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json() as Promise<NotificationsResponse>;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Query: Get staff notifications
export function useStaffNotifications(params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}) {
  return useQuery({
    queryKey: ["staff", "notifications", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.isRead !== undefined)
        searchParams.set("isRead", params.isRead.toString());

      const response = await fetch(`/api/staff/notifications?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch staff notifications");
      }
      return response.json() as Promise<NotificationsResponse>;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
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
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["staff", "notifications"] });
    },
  });
}
