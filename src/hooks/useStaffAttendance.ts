import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AttendanceRecord {
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | null;
  punchIn: string | null;
  punchOut: string | null;
}

interface CompanySettings {
  shiftStartTime: string;
  shiftEndTime: string;
  minWorkingHours: number;
  maxDailyHours: number;
}

// Query: Get staff attendance for a month
export function useStaffAttendance(year: number, month: number) {
  return useQuery({
    queryKey: ["staff", "attendance", year, month],
    queryFn: async () => {
      const response = await fetch(
        `/api/staff/attendance?year=${year}&month=${month}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch attendance data");
      }
      return response.json() as Promise<AttendanceRecord[]>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Query: Get today's attendance
export function useTodayAttendance() {
  return useQuery({
    queryKey: ["staff", "attendance", "today"],
    queryFn: async () => {
      const response = await fetch("/api/attendance/today");
      if (!response.ok) {
        throw new Error("Failed to fetch today's attendance");
      }
      const data = await response.json();
      return data.attendance as AttendanceRecord | null;
    },
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

// Query: Get company settings
export function useCompanySettings() {
  return useQuery({
    queryKey: ["staff", "company"],
    queryFn: async () => {
      const response = await fetch("/api/staff/company");
      if (!response.ok) {
        throw new Error("Failed to fetch company settings");
      }
      const { company } = await response.json();
      return {
        shiftStartTime: company.shiftStartTime || "09:00",
        shiftEndTime: company.shiftEndTime || "18:00",
        minWorkingHours: company.minWorkingHours || 4.0,
        maxDailyHours: company.maxDailyHours || 16.0,
      } as CompanySettings;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Mutation: Punch attendance
export function usePunchAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      imageData,
    }: {
      type: "in" | "out";
      imageData: string;
    }) => {
      // Upload image
      const imageDataRes = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ image: imageData }),
        headers: { "Content-Type": "application/json" },
      });

      if (!imageDataRes.ok) {
        throw new Error("Image upload failed");
      }

      const { imageUrl } = await imageDataRes.json();

      // Punch
      const response = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, imageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData);
        throw new Error(errorData.error || "Punch failed");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["staff", "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
    },
  });
}
