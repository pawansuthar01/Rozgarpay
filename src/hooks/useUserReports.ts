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
  absentDays: number;
  lateDays: number;
  attendanceRecords: AttendanceRecord[];
}

export interface UserSalaryReport {
  month: number;
  year: number;
  grossAmount: number;
  netAmount: number;
  totalPaid: number;
  totalRecovered: number;
  balanceAmount: number;
  pdfUrl?: string;
  payments: {
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
  }[];
  deductions: {
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
  }[];
  recoveries: {
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
  }[];
  breakdowns: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
}

export function useUserAttendanceReport(userId: string, monthYear: string) {
  return useQuery({
    queryKey: ["userAttendanceReport", userId, monthYear],
    queryFn: async (): Promise<UserAttendanceReport> => {
      const startTime = performance.now();
      try {
        const response = await fetch(
          `/api/admin/users/${userId}/attendance?month=${monthYear}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch attendance report");
        }
        const data = await response.json();

        performanceMonitor.recordQueryMetric({
          queryKey: `userAttendanceReport.${userId}.${monthYear}`,
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: `userAttendanceReport.${userId}.${monthYear}`,
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
    enabled: !!userId && !!monthYear,
  });
}

export function useUserSalaryReport(userId: string, monthYear: string) {
  return useQuery({
    queryKey: ["userSalaryReport", userId, monthYear],
    queryFn: async (): Promise<UserSalaryReport> => {
      const startTime = performance.now();
      try {
        const response = await fetch(
          `/api/admin/users/${userId}/salary?month=${monthYear}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch salary report");
        }
        const data = await response.json();

        performanceMonitor.recordQueryMetric({
          queryKey: `userSalaryReport.${userId}.${monthYear}`,
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return data;
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: `userSalaryReport.${userId}.${monthYear}`,
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
    enabled: !!userId && !!monthYear,
  });
}
