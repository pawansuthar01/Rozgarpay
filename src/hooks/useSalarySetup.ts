import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { performanceMonitor } from "@/lib/performanceMonitor";

interface StaffMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  baseSalary: number | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  salaryType: string | null;
  workingDays: number | null;
  overtimeRate: number | null;
  pfEsiApplicable: boolean | null;
  joiningDate: string | null;
  createdAt: string;
}

interface SalarySetupResponse {
  staff: StaffMember[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

interface SalarySetupUpdate {
  userId: string;
  baseSalary?: string;
  hourlyRate?: string;
  dailyRate?: string;
  salaryType?: string;
  workingDays?: string;
  overtimeRate?: string;
  pfEsiApplicable?: boolean;
  joiningDate?: string;
}

interface UpdateSalarySetupRequest {
  staffUpdates: SalarySetupUpdate[];
}

// Query: Get salary setup data
export function useSalarySetup(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ["salary-setup", params],
    queryFn: async () => {
      const startTime = performance.now();
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.search) searchParams.set("search", params.search);

      try {
        const response = await fetch(`/api/admin/salary-setup?${searchParams}`);
        if (!response.ok) {
          throw new Error("Failed to fetch salary setup data");
        }
        const data = (await response.json()) as SalarySetupResponse;

        performanceMonitor.recordQueryMetric({
          queryKey: "salary-setup.list",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "salary-setup.list",
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
}

// Mutation: Update salary configurations
export function useUpdateSalarySetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSalarySetupRequest) => {
      const response = await fetch("/api/admin/salary-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Failed to update salary configurations",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-setup"] });
    },
  });
}
