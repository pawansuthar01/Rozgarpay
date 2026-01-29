import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveAttendance,
  getAttendanceByUser,
  getAttendanceByDate,
  isOnline,
} from "@/lib/storage";

interface AttendanceTrend {
  date: string;
  count: number;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    phone: string;
  };
  attendanceDate: string;
  punchIn: string | null;
  punchOut: string | null;
  status: string;
  punchOutImageUrl?: string;
  punchInImageUrl?: string;
  workingHours?: number;
  overtimeHours?: number;
  shiftDurationHours?: number;
  isLate?: boolean;
  LateMinute?: number;
  requiresApproval?: boolean;
  approvalReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface AttendanceResponse {
  records: AttendanceRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalRecords: number;
    pending: number;
    approved: number;
    rejected: number;
    absent: number;
    leave: number;
  };
  charts: {
    statusDistribution: { name: string; value: number; color: string }[];
    dailyTrends: { date: string; count: number }[];
  };
}

interface TodayAttendanceResponse {
  hasPunchedIn: boolean;
  hasPunchedOut: boolean;
  punchInTime?: string;
  punchOutTime?: string;
  totalHours?: number;
}

interface PunchRequest {
  type: "IN" | "OUT";
  latitude: number;
  longitude: number;
  photo: string;
}

interface PunchResponse {
  attendanceId: string;
  status: string;
  timestamp: string;
}

interface UpdateAttendanceRequest {
  punchInTime?: string;
  punchOutTime?: string;
  status?: "APPROVED" | "REJECTED" | "ABSENT" | "LEAVE";
}

interface ManagerAttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  attendanceDate: string;
  punchIn: string;
  punchOut: string | null;
  status: string;
  imageUrl: string | null;
}

interface ManagerAttendanceResponse {
  records: ManagerAttendanceRecord[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

interface UpdateAttendanceStatusRequest {
  status: "APPROVED" | "REJECTED" | "ABSENT" | "LEAVE";
}

// Query: Get attendance records
export function useAttendance(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  date?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  return useQuery({
    queryKey: ["attendance", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.userId) searchParams.set("userId", params.userId);
      if (params?.date) searchParams.set("date", params.date);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

      const response = await fetch(`/api/admin/attendance?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch attendance");
      }

      const data = (await response.json()) as AttendanceResponse;

      // Cache the data in IndexedDB for offline use
      if (data.records && data.records.length > 0) {
        try {
          await saveAttendance(
            data.records.map((record) => ({
              id: record.id,
              userId: record.userId,
              attendanceDate: record.attendanceDate,
              punchInTime: record.punchIn,
              punchOutTime: record.punchOut,
              status: record.status,
              totalHours: record.workingHours,
            })),
          );
        } catch (error) {
          console.warn("Failed to cache attendance data:", error);
        }
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Query: Get today's attendance
export function useTodayAttendance() {
  return useQuery({
    queryKey: ["attendance", "today"],
    queryFn: async () => {
      const response = await fetch("/api/attendance/today");
      if (!response.ok) {
        throw new Error("Failed to fetch today's attendance");
      }
      return response.json() as Promise<TodayAttendanceResponse>;
    },
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

// Mutation: Punch attendance
export function usePunchAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PunchRequest) => {
      const response = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to punch attendance");
      }

      return response.json() as Promise<PunchResponse>;
    },
    onSuccess: () => {
      // Invalidate today's attendance
      queryClient.invalidateQueries({ queryKey: ["attendance", "today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

// Query: Get attendance by ID
export function useAttendanceById(attendanceId: string) {
  return useQuery({
    queryKey: ["attendance", attendanceId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/attendance/${attendanceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch attendance record");
      }
      return response.json() as Promise<{
        attendance: AttendanceRecord;
        auditHistory: AttendanceRecord[];
        charts: {
          attendanceTrends: AttendanceTrend[];
        };
      }>;
    },
    enabled: !!attendanceId,
  });
}

// Mutation: Update attendance
export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attendanceId,
      data,
    }: {
      attendanceId: string;
      data: UpdateAttendanceRequest;
    }) => {
      const response = await fetch(
        `/api/admin/attendance/${attendanceId}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update attendance");
      }

      return response.json() as Promise<{ attendance: AttendanceRecord }>;
    },
    onSuccess: (data, variables) => {
      // Update the cache with the new attendance data
      queryClient.setQueriesData(
        { queryKey: ["attendance"] },
        (oldData: any) => {
          if (!oldData?.records) return oldData;
          return {
            ...oldData,
            records: oldData.records.map((record: AttendanceRecord) =>
              record.id === variables.attendanceId
                ? { ...data.attendance }
                : record,
            ),
          };
        },
      );
      queryClient.invalidateQueries({
        queryKey: ["attendance", variables.attendanceId],
      });
    },
  });
}
export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attendanceId,
      data,
    }: {
      attendanceId: string;
      data: UpdateAttendanceRequest;
    }) => {
      const response = await fetch(`/api/admin/attendance/${attendanceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update attendance");
      }

      return response.json() as Promise<{ attendance: AttendanceRecord }>;
    },
    onSuccess: (data, variables) => {
      // Update the cache with the new attendance data
      queryClient.setQueriesData(
        { queryKey: ["attendance"] },
        (oldData: any) => {
          if (!oldData?.records) return oldData;
          return {
            ...oldData,
            records: oldData.records.map((record: AttendanceRecord) =>
              record.id === variables.attendanceId
                ? { ...data.attendance }
                : record,
            ),
          };
        },
      );
      queryClient.invalidateQueries({
        queryKey: ["attendance", variables.attendanceId],
      });
    },
  });
}

// Query: Get attendance reports
export function useAttendanceReports(params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["attendance", "reports", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.set("startDate", params.startDate);
      if (params?.endDate) searchParams.set("endDate", params.endDate);
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      const response = await fetch(
        `/api/admin/reports/attendance?${searchParams}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch attendance reports");
      }
      return response.json() as Promise<{
        totalRecords: number;
        present: number;
        absent: number;
        late: number;
        trends: {
          date: string;
          present: number;
          absent: number;
          late: number;
        }[];
        staffSummary: {
          userId: string;
          user: {
            firstName: string | null;
            lastName: string | null;
            email: string;
          };
          present: number;
          absent: number;
          late: number;
        }[];
        totalPages: number;
      }>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Query: Get missing attendance
export function useMissingAttendance(params?: {
  date?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["attendance", "missing", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.date) searchParams.set("date", params.date);
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      const response = await fetch(
        `/api/admin/attendance/missing?${searchParams}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch missing attendance");
      }
      return response.json() as Promise<{
        missingStaff: any[];
        pagination: any;
        totalMissing: number;
      }>;
    },
  });
}

// Mutation: Mark attendance for missing staff
export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      date,
      status = "APPROVED",
      reason,
    }: {
      userId: string;
      date: string;
      status?: "APPROVED" | "ABSENT" | "LEAVE";
      reason?: string;
    }) => {
      const response = await fetch("/api/admin/attendance/missing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          date,
          status,
          reason: reason || "Manual attendance entry by admin",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark attendance");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "missing"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

// Query: Get manager attendance records
export function useManagerAttendance(params?: {
  page?: number;
  limit?: number;
  date?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["manager", "attendance", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.date) searchParams.set("date", params.date);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.search) searchParams.set("search", params.search);

      const response = await fetch(`/api/manager/attendance?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch manager attendance");
      }
      return response.json() as Promise<ManagerAttendanceResponse>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation: Update attendance status (approve/reject)
export function useUpdateAttendanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attendanceId,
      data,
    }: {
      attendanceId: string;
      data: UpdateAttendanceStatusRequest;
    }) => {
      const response = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update attendance status");
      }

      return response.json();
    },
    onMutate: async ({ attendanceId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["manager", "attendance"] });

      // Snapshot the previous value
      const previousAttendance = queryClient.getQueryData([
        "manager",
        "attendance",
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(["manager", "attendance"], (old: any) => {
        if (!old?.records) return old;
        return {
          ...old,
          records: old.records.map((record: any) =>
            record.id === attendanceId
              ? { ...record, status: data.status }
              : record,
          ),
        };
      });

      // Return a context object with the snapshotted value
      return { previousAttendance };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousAttendance) {
        queryClient.setQueryData(
          ["manager", "attendance"],
          context.previousAttendance,
        );
      }
      console.error("Failed to update attendance status:", err);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["manager", "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}
