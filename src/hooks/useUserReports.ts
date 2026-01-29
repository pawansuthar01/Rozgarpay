import { useQuery } from "@tanstack/react-query";

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
}

export function useUserAttendanceReport(userId: string, monthYear: string) {
  return useQuery({
    queryKey: ["userAttendanceReport", userId, monthYear],
    queryFn: async (): Promise<UserAttendanceReport> => {
      const response = await fetch(
        `/api/admin/users/${userId}/attendance?month=${monthYear}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch attendance report");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId && !!monthYear,
  });
}

export function useUserSalaryReport(userId: string, monthYear: string) {
  return useQuery({
    queryKey: ["userSalaryReport", userId, monthYear],
    queryFn: async (): Promise<UserSalaryReport> => {
      const response = await fetch(
        `/api/admin/users/${userId}/salary?month=${monthYear}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch salary report");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId && !!monthYear,
  });
}
