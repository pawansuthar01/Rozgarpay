import { useQuery } from "@tanstack/react-query";
import type { User } from "next-auth";
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

interface AttendanceData {
  user: User | null;
  records: AttendanceRecord[];
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalHours: number;
  };
}

interface ApiResponse {
  attendanceRecords: AttendanceRecord[];
  user: User;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
}

export function useUserAttendance(userId: string, month: number, year: number) {
  return useQuery({
    queryKey: ["userAttendance", userId, month, year],
    queryFn: async (): Promise<AttendanceData> => {
      const startTime = performance.now();
      try {
        const response = await fetch(
          `/api/admin/users/${userId}/attendance?month=${month}&year=${year}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch attendance data");
        }
        const data: ApiResponse = await response.json();

        performanceMonitor.recordQueryMetric({
          queryKey: `userAttendance.${userId}.${month}.${year}`,
          duration: performance.now() - startTime,
          status: "success",
          isCacheHit: false,
          timestamp: Date.now(),
        });

        return {
          records: data.attendanceRecords,
          user: data.user,
          summary: {
            totalDays: data.totalDays,
            presentDays: data.presentDays,
            absentDays: data.absentDays,
            lateDays: data.lateDays,
            totalHours: data.attendanceRecords.reduce(
              (sum: number, record: any) => sum + (record.workingHours || 0),
              0,
            ),
          },
        };
      } catch (error) {
        performanceMonitor.recordQueryMetric({
          queryKey: `userAttendance.${userId}.${month}.${year}`,
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
    enabled: !!userId && month > 0 && year > 0,
  });
}
