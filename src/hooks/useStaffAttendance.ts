import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceKeys } from "@/lib/queryKeys";
import { performanceMonitor } from "@/lib/performanceMonitor";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ABSENT" | "LEAVE" | null;
  punchIn: string | null;
  punchOut: string | null;
  workingHours: number | null;
  overtimeHours: number | null;
  lateMinutes: number | null;
  isLate: boolean | null;
  requiresApproval: boolean;
  approvalReason: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  hasRecord: boolean;
}
interface MonthsStats {
  total: number;
  pendingDays: number;
  noMarkedDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  totalWorkingHours: number;
  totalOvertimeHours: number;
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
    queryKey: ["staff", "attendance", year, month] as const,
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const response = await fetch(
          `/api/staff/attendance?year=${year}&month=${month}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch attendance data");
        }
        const data = (await response.json()) as {
          records: AttendanceRecord[];
          summary: MonthsStats;
        };

        performanceMonitor.recordQueryMetric({
          queryKey: `staff.attendance.${year}.${month}`,
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: `staff.attendance.${year}.${month}`,
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 20,
    gcTime: 1000 * 60,
  });
}

// Query: Get today's attendance - optimized with proper caching
export function useTodayAttendance() {
  return useQuery({
    queryKey: attendanceKeys.today(),
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const response = await fetch("/api/attendance/today");
        if (!response.ok) {
          throw new Error("Failed to fetch today's attendance");
        }
        const data = await response.json();

        performanceMonitor.recordQueryMetric({
          queryKey: "staff.attendance.today",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data.attendance as AttendanceRecord | null;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "staff.attendance.today",
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 30, // 30 seconds - balance freshness with performance
    gcTime: 1000 * 60 * 1, // 5 minutes cache
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

// Query: Get company settings
export function useCompanySettings() {
  return useQuery({
    queryKey: ["staff", "company"], // Use stable key
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const response = await fetch("/api/staff/company");
        if (!response.ok) {
          throw new Error("Failed to fetch company settings");
        }
        const { company } = await response.json();

        performanceMonitor.recordQueryMetric({
          queryKey: "staff.company",
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return {
          shiftStartTime: company.shiftStartTime || "09:00",
          shiftEndTime: company.shiftEndTime || "18:00",
          minWorkingHours: company.minWorkingHours || 4.0,
          maxDailyHours: company.maxDailyHours || 16.0,
        } as CompanySettings;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: "staff.company",
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 6, // 1 hour - rarely changes
    gcTime: 1000 * 60 * 60, // 24 hours cache
  });
}

interface ValidationData {
  valid: boolean;
  error?: string;
  punchType: "in" | "out";
  attendanceId?: string;
  lateMinutes?: number;
  isLate?: boolean;
}

// Mutation: Staff punch attendance - optimized with validation-first flow
export function useStaffPunchAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      imageData,
      validation,
    }: {
      type: "in" | "out";
      imageData: string;
      validation: ValidationData;
    }) => {
      // Upload image (only after validation passes)
      const imageDataRes = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ image: imageData }),
        headers: { "Content-Type": "application/json" },
      });

      if (!imageDataRes.ok) {
        throw new Error("Image upload failed");
      }

      const { imageUrl } = await imageDataRes.json();

      // Punch with validation data
      const response = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, imageUrl, validation }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData);
        throw new Error(errorData.error || "Punch failed");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
    },
  });
}
