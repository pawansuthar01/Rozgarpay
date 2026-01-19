export interface AttendanceRecord {
  id: string;
  userId: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  attendanceDate: string;
  punchIn: string | null;
  punchOut: string | null;
  status: string;
  punchOutImageUrl?: string;
  punchInImageUrl?: string;
  workingHours?: number;
  overtimeHours?: number;
  isLate?: boolean;
  requiresApproval?: boolean;
  approvalReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface AttendanceStats {
  totalRecords: number;
  pending: number;
  approved: number;
  rejected: number;
  halfDay: number;
}

export interface AttendanceTrend {
  date: string;
  count: number;
}

export interface AttendanceApiResponse {
  records: AttendanceRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: AttendanceStats;
  charts: {
    statusDistribution: { name: string; value: number; color: string }[];
    dailyTrends: AttendanceTrend[];
  };
}
