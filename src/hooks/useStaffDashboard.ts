import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

// Query: Get staff dashboard data
export function useStaffDashboard() {
  return useQuery({
    queryKey: ["staff", "dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/staff/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json() as Promise<DashboardData>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
