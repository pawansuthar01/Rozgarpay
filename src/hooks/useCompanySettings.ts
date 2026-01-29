import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  enableLatePenalty: boolean;
  latePenaltyPerMinute: number;
  enableAbsentPenalty: boolean;
  absentPenaltyPerDay: number;
}

interface CompanyResponse {
  company: Company;
}

// Query: Get company settings
export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/company");
      if (!response.ok) {
        throw new Error("Failed to fetch company settings");
      }
      return response.json() as Promise<CompanyResponse>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });
}
