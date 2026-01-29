import { useQuery } from "@tanstack/react-query";
import type { User } from "next-auth";

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
      const response = await fetch(
        `/api/admin/users/${userId}/attendance?month=${month}&year=${year}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch attendance data");
      }
      const data: ApiResponse = await response.json();

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
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId && month > 0 && year > 0, // Only fetch if userId is present and month/year are valid
  });
}
