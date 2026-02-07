import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { performanceMonitor } from "@/lib/performanceMonitor";

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  logo?: string | null;
  shiftStartTime: string;
  shiftEndTime: string;
  gracePeriodMinutes: number;
  minWorkingHours: number;
  maxDailyHours: number;
  autoPunchOutBufferMinutes: number;
  locationLat?: number;
  locationLng?: number;
  locationRadius: number;
  overtimeThresholdHours: number;
  nightPunchInWindowHours: number;
  defaultSalaryType: string;
  overtimeMultiplier: number;
  enableLatePenalty: boolean;
  latePenaltyPerMinute: number;
  enableAbsentPenalty: boolean;
  halfDayThresholdHours: number;
  absentPenaltyPerDay: number;
  pfPercentage: number;
  esiPercentage: number;
  status: string;
}

interface CompanyResponse {
  company: Company;
}

// Query: Get company settings
export function useCompanySettings() {
  return useQuery({
    queryKey: queryKeys.company,
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const response = await fetch("/api/admin/company");
        if (!response.ok) {
          throw new Error("Failed to fetch company settings");
        }
        const data = (await response.json()) as CompanyResponse;

        performanceMonitor.recordQueryMetric({
          queryKey: "company-settings",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "company-settings",
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - low volatility
    gcTime: 1000 * 60 * 30, // 30 minutes cache
  });
}

// Mutation: Update company settings
export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<Company>) => {
      const response = await fetch("/api/admin/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update settings");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Immediately update the cache with new data for instant UI feedback
      queryClient.setQueryData<CompanyResponse>(
        queryKeys.company,
        (oldData) => {
          if (!oldData) return data;
          return {
            ...oldData,
            company: {
              ...oldData.company,
              ...data.company,
            },
          };
        },
      );
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.company });
    },
  });
}
