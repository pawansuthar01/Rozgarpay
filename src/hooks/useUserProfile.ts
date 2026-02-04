import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersKeys } from "@/lib/queryKeys";
import { performanceMonitor } from "@/lib/performanceMonitor";

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

interface AttendanceSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  statusData: Array<{ name: string; value: number; color: string }>;
  monthlyTrend: any[];
}

interface SalarySummary {
  totalRecords: number;
  totalGross: number;
  totalNet: number;
  monthlyTrend: any[];
}

interface UserData {
  user: UserProfile;
  attendanceSummary: AttendanceSummary;
  salarySummary: SalarySummary;
  attendanceRecords: {
    data: any[];
    pagination: { page: number; totalPages: number; total: number };
  };
  salaryRecords: {
    data: any[];
    pagination: { page: number; totalPages: number; total: number };
  };
}

interface CurrentMonthData {
  netAmount: number;
  totalPaid: number;
  totalRecovered: number;
  balanceAmount: number;
}

export function useUserProfile(userId: string, salaryPage: number) {
  const queryClient = useQueryClient();

  const {
    data: userData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: usersKeys.details(userId),
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const response = await fetch(
          `/api/admin/users/${userId}?salaryPage=${salaryPage}&limit=10`,
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch user data");
        }
        const data = (await response.json()) as UserData;

        performanceMonitor.recordQueryMetric({
          queryKey: `userProfile.${userId}`,
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: `userProfile.${userId}`,
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes cache
  });

  const { data: currentMonthData } = useQuery({
    queryKey: ["userCurrentMonth", userId],
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const response = await fetch(`/api/admin/users/${userId}/salary`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch current month data");
        }
        const data = (await response.json()) as CurrentMonthData;

        performanceMonitor.recordQueryMetric({
          queryKey: `userCurrentMonth.${userId}`,
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: `userCurrentMonth.${userId}`,
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes cache
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
        const data = await response.json();
        throw new Error(data.error || "Failed to update user status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.details(userId) });
      queryClient.invalidateQueries({ queryKey: ["userCurrentMonth", userId] });
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
      queryClient.invalidateQueries({ queryKey: usersKeys.stats() });
    },
  });

  const updateStatus = (newStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") => {
    return mutation.mutateAsync({ newStatus });
  };

  return {
    userData,
    currentMonthData,
    loading,
    error: error?.message || null,
    updateStatus,
  };
}
