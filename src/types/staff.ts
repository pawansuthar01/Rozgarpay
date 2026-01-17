export interface StaffMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  todayAttendance: any;
  attendanceStats: {
    approved: number;
    pending: number;
    rejected: number;
    total: number;
  };
  pendingAttendanceCount: number;
  currentMonthSalary: any;
}

export interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  todayPresent: number;
  todayPending: number;
  todayAttendanceRate: number;
}

export interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
}

export interface SalaryDistribution {
  paid: number;
  pending: number;
  processing: number;
}

export interface StaffApiResponse {
  staff: StaffMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: StaffStats;
  charts: {
    attendanceTrends: AttendanceTrend[];
    salaryDistribution: SalaryDistribution;
  };
}
