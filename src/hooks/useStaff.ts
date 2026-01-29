import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  todayAttendance?: {
    id: string;
    status: string;
    attendanceDate: string;
  };
  attendanceStats: {
    approved: number;
    pending: number;
    rejected: number;
    total: number;
  };
  pendingAttendanceCount: number;
  currentMonthSalary?: {
    id: string;
    status: string;
    netSalary: number;
  };
}

interface StaffResponse {
  staff: StaffMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalStaff: number;
    activeStaff: number;
    todayPresent: number;
    todayPending: number;
    todayAttendanceRate: number;
  };
  charts: {
    attendanceTrends: Array<{
      date: string;
      present: number;
      absent: number;
    }>;
    salaryDistribution: {
      paid: number;
      pending: number;
      processing: number;
    };
  };
}

// Query: Get staff members
export function useStaff(params?: {
  page?: number;
  limit?: number;
  status?: string;
  attendanceStatus?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["staff", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.status) searchParams.set("status", params.status);
      if (params?.attendanceStatus)
        searchParams.set("attendanceStatus", params.attendanceStatus);
      if (params?.search) searchParams.set("search", params.search);

      const response = await fetch(`/api/admin/staff?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch staff");
      }
      return response.json() as Promise<StaffResponse>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
