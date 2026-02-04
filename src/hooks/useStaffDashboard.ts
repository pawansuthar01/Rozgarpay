import { useQuery, queryOptions } from "@tanstack/react-query";
import { performanceMonitor } from "@/lib/performanceMonitor";

interface SalarySetup {
  isConfigured: boolean;
  baseSalary: number | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  salaryType: string | null;
}

interface DashboardData {
  user: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  salarySetup: SalarySetup;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: "info" | "warning" | "success";
    createdAt: string;
  }>;
}

// Query options for prefetching
export const staffDashboardOptions = queryOptions({
  queryKey: ["staff", "dashboard", "me"] as const,
  queryFn: async () => {
    const startTime = performance.now();
    try {
      const response = await fetch("/api/staff/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const data = (await response.json()) as DashboardData;

      performanceMonitor.recordQueryMetric({
        queryKey: "staff.dashboard",
        duration: performance.now() - startTime,
        status: "success",
        isCacheHit: false,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      performanceMonitor.recordQueryMetric({
        queryKey: "staff.dashboard",
        duration: performance.now() - startTime,
        status: "error",
        isCacheHit: false,
        timestamp: Date.now(),
      });
      throw error;
    }
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
  gcTime: 1000 * 60 * 30, // 30 minutes cache
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
});

// Query: Get staff dashboard data
export function useStaffDashboard() {
  return useQuery({
    queryKey: ["staff", "dashboard", "me"] as const,
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const response = await fetch("/api/staff/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const data = (await response.json()) as DashboardData;

        performanceMonitor.recordQueryMetric({
          queryKey: "staff.dashboard",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "staff.dashboard",
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

// Prefetch helper for other components
export async function prefetchStaffDashboard(queryClient: any) {
  return queryClient.prefetchQuery({
    queryKey: ["staff", "dashboard", "me"],
    queryFn: async () => {
      const response = await fetch("/api/staff/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
  });
}
