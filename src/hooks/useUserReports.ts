import { useQuery } from "@tanstack/react-query";
import { performanceMonitor } from "@/lib/performanceMonitor";

export interface AttendanceRecord {
  id: string;
  attendanceDate: string;
  punchIn: string | null;
  punchOut: string | null;
  status: string;
  workingHours: number;
  isLate: boolean;
  isLateMinutes?: number;
  overtimeHours: number;
  shiftDurationHours?: number;
}

export interface UserAttendanceReport {
  totalDays: number;
  presentDays: number;
  noMarkedDays: number;
  totalWorkingHours: number;
  absentDays: number;
  lateDays: number;
  attendanceRecords: AttendanceRecord[];
}

export interface UserSalaryReport {
  month: number;
  year: number;
  dateRange?: {
    start: string;
    end: string;
  };
  grossAmount: number;
  netAmount: number;
  totalPaid: number;
  totalDeductions: number;
  totalRecovered: number;
  balanceAmount: number;
  pdfUrl?: string;
  payments: {
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
    month?: number;
    year?: number;
  }[];
  deductions: {
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
    month?: number;
    year?: number;
  }[];
  recoveries: {
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
    month?: number;
    year?: number;
  }[];
  allTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
    category: string;
    month?: number;
    year?: number;
  }>;
  breakdowns: Array<{
    type: string;
    description: string;
    amount: number;
    category?: string;
  }>;
  salaryCount?: number;
  months?: Array<{ month: number; year: number }>;
}

export function useUserAttendanceReport(
  userId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ["userAttendanceReport", userId, startDate, endDate],
    queryFn: async (): Promise<UserAttendanceReport> => {
      const startTime = performance.now();
      try {
        const response = await fetch(
          `/api/admin/users/${userId}/attendance?startDate=${startDate}&endDate=${endDate}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch attendance report");
        }
        const data = await response.json();

        performanceMonitor.recordQueryMetric({
          queryKey: `userAttendanceReport.${userId}.${startDate}.${endDate}`,
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: `userAttendanceReport.${userId}.${startDate}.${endDate}`,
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // Data stays fresh for 2 minutes
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes after stale
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: true, // Refetch on mount for fresh data
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1, // Retry failed requests once
    enabled: !!userId && !!startDate && !!endDate,
  });
}

export function useUserSalaryReport(
  userId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ["userSalaryReport", userId, startDate, endDate],
    queryFn: async (): Promise<UserSalaryReport> => {
      const startTime = performance.now();
      try {
        const response = await fetch(
          `/api/admin/users/${userId}/salary?startDate=${startDate}&endDate=${endDate}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch salary report");
        }
        const data = await response.json();

        performanceMonitor.recordQueryMetric({
          queryKey: `userSalaryReport.${userId}.${startDate}.${endDate}`,
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: `userSalaryReport.${userId}.${startDate}.${endDate}`,
          duration: performance.now() - startTime,
          status: "error",
          isCacheHit: false,
          timestamp: Date.now(),
        });
        throw error;
      }
    },
    staleTime: 0, // Always fetch fresh data when date range changes
    gcTime: 0, // Don't cache
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 1,
    enabled: !!userId && !!startDate && !!endDate,
  });
}
