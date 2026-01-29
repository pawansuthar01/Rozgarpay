import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface DashboardStats {
  totalStaff: number;
  todaysAttendance: {
    present: number;
    absent: number;
    pending: number;
  };
  monthlySalarySummary: {
    totalPaid: number;
    pending: number;
  };
  cashbookBalance: number;
  recentActivities: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
  }>;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query: Get dashboard stats
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      const data = await response.json();

      // Transform to match expected DashboardStats interface
      return {
        totalStaff: data.staffCount,
        todaysAttendance: {
          present: data.attendance.approved,
          absent: data.attendance.absent,
          pending: data.attendance.pending,
        },
        monthlySalarySummary: {
          totalPaid: data.monthlySalaryTotal,
          pending: 0, // Not available in current API
        },
        cashbookBalance: data.cashbookBalance,
        recentActivities: data.recentActivity.map((log: any) => ({
          id: log.id,
          action: log.action,
          user: log.user,
          timestamp: log.timestamp,
        })),
      } as DashboardStats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Query: Get audit logs
export function useAuditLogs(params?: {
  page?: number;
  limit?: number;
  filter?: string;
}) {
  return useQuery({
    queryKey: ["dashboard", "audit-logs", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.filter) searchParams.set("filter", params.filter);

      const response = await fetch(`/api/admin/audit-logs?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      return response.json() as Promise<AuditLogsResponse>;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Mutation: Complete onboarding
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate session-related queries
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
