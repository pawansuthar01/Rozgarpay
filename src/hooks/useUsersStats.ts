import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usersKeys } from "@/lib/queryKeys";
import { performanceMonitor } from "@/lib/performanceMonitor";

interface UsersStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  deactivatedUsers: number;
  roleDistribution: {
    ADMIN: number;
    MANAGER: number;
    ACCOUNTANT: number;
    STAFF: number;
  };
}

export function useUsersStats() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: usersKeys.stats(),
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const res = await fetch("/api/admin/users/stats");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch stats");
        }
        const data = await res.json();

        performanceMonitor.recordQueryMetric({
          queryKey: "users.stats",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data as UsersStats;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "users.stats",
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes cache
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: usersKeys.stats() });
  };

  return { stats, refetch };
}
