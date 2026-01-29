import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
    queryKey: ["userProfile", userId, salaryPage],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/users/${userId}?salaryPage=${salaryPage}&limit=10`,
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch user data");
      }
      return response.json() as Promise<UserData>;
    },
    enabled: !!userId,
    refetchOnMount: "always",
  });

  const { data: currentMonthData } = useQuery({
    queryKey: ["userCurrentMonth", userId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${userId}/salary`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch current month data");
      }
      return response.json() as Promise<CurrentMonthData>;
    },
    enabled: !!userId,
    refetchOnMount: "always",
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
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["userCurrentMonth", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["usersStats"] });
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
