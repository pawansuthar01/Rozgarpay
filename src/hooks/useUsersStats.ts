import { useQuery, useQueryClient } from "@tanstack/react-query";

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
    queryKey: ["usersStats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/stats");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch stats");
      }
      return res.json();
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["usersStats"] });
  };

  return { stats, refetch };
}
