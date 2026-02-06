import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  onboardingCompleted: boolean;
}

interface SalaryTotals {
  totalGiven: number;
  totalPending: number;
  totalPaid: number;
  totalRecovered: number;
  netPosition: number;
}

interface CurrentMonthSalary {
  netAmount: number;
  totalPaid: number;
  totalRecovered: number;
  balanceAmount: number;
  period?: string;
  grossAmount?: number;
}

interface UserData {
  user: UserProfile;
  totals: SalaryTotals;
  thisMonthData: CurrentMonthSalary;
  salaryRecords: {
    data: any[];
    pagination: { page: number; totalPages: number; total: number };
  };
}

export function useUserProfile(userId: string, page: number = 1) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (userId) {
      queryClient.prefetchQuery({
        queryKey: ["user", userId],
        queryFn: () =>
          fetch(`/api/admin/users/${userId}?page=1&limit=5`).then((r) =>
            r.json(),
          ),
        staleTime: 0, // Always refetch
      });
    }
  }, [userId, queryClient]);

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/users/${userId}?page=${page}&limit=5`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch user data");
      }
      return response.json() as Promise<UserData>;
    },
    enabled: !!userId,
    staleTime: 0, // Always get fresh data
    gcTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  const mutation = useMutation({
    mutationFn: async ({
      newStatus,
    }: {
      newStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
    },
  });

  const updateStatus = (newStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") => {
    return mutation.mutateAsync({ newStatus });
  };

  return {
    userData: data,
    loading,
    error: error?.message || null,
    updateStatus,
  };
}
