import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { saveAttendance } from "@/lib/storageWorker";
import { performanceMonitor } from "@/lib/performanceMonitor";
import { AttendanceRecord } from "@/types/attendance";

// ============================================================================
// Types
// ============================================================================

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

interface AuditLogRecord {
  id: string;
  action: string;
  details: string;
  userId: string;
  createdAt: string;
}

interface MissingStaff {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
}

interface MissingStaffResponse {
  missingStaff: MissingStaff[];
  totalMissing: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserMissingAttendanceResponse {
  userId: string;
  totalDays: number;
  presentDays: number;
  missingDays: number;
  missingDates: {
    date: string;
    formattedDate: string;
  }[];
}

export type {
  AttendanceRecord,
  AttendanceResponse,
  TodayAttendanceResponse,
  PunchRequest,
  PunchResponse,
  UpdateAttendanceRequest,
  ManagerAttendanceRecord,
  ManagerAttendanceResponse,
  UpdateAttendanceStatusRequest,
  AuditLogRecord,
  MissingStaff,
  MissingStaffResponse,
  UserMissingAttendanceResponse,
};

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchAttendance(
  params?: Record<string, string | number | undefined>,
): Promise<AttendanceResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.userId) searchParams.set("userId", String(params.userId));
  if (params?.date) searchParams.set("date", String(params.date));
  if (params?.status) searchParams.set("status", String(params.status));
  if (params?.search) searchParams.set("search", String(params.search));
  if (params?.sortBy) searchParams.set("sortBy", String(params.sortBy));
  if (params?.sortOrder)
    searchParams.set("sortOrder", String(params.sortOrder));

  const startTime = performance.now();

  try {
    const response = await fetch(`/api/admin/attendance?${searchParams}`);

    if (!response.ok) {
      throw new Error("Failed to fetch attendance");
    }

    const data = (await response.json()) as AttendanceResponse;

    const duration = performance.now() - startTime;
    performanceMonitor.recordQueryMetric({
      queryKey: "attendance.list",
      duration,
      status: "success",
      isCacheHit: false,
      timestamp: Date.now(),
    });

    // Cache to IndexedDB (non-blocking)
    if (data.records && data.records.length > 0) {
      saveAttendance(
        data.records.map((record) => ({
          id: record.id,
          userId: record.userId,
          attendanceDate: record.attendanceDate,
          punchInTime: record.punchIn,
          punchOutTime: record.punchOut,
          status: record.status,
          totalHours: record.workingHours,
        })),
      ).catch(() => {
        /* Ignore caching errors */
      });
    }

    return data;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.recordQueryMetric({
      queryKey: "attendance.list",
      duration,
      status: "error",
      isCacheHit: false,
      timestamp: Date.now(),
    });
    throw error;
  }
}

async function fetchTodayAttendance(): Promise<TodayAttendanceResponse> {
  const startTime = performance.now();

  try {
    const response = await fetch("/api/attendance/today");

    if (!response.ok) {
      throw new Error("Failed to fetch today's attendance");
    }

    const data = (await response.json()) as TodayAttendanceResponse;

    const duration = performance.now() - startTime;
    performanceMonitor.recordQueryMetric({
      queryKey: "attendance.today",
      duration,
      status: "success",
      isCacheHit: false,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.recordQueryMetric({
      queryKey: "attendance.today",
      duration,
      status: "error",
      isCacheHit: false,
      timestamp: Date.now(),
    });
    throw error;
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Optimized attendance records query - uses caching to prevent unnecessary re-fetches
 */
export function useAttendance(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  date?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["attendance", "list", params] as const,
    queryFn: () => fetchAttendance(params),
    staleTime: 1000 * 10, // Cache for 30 seconds - prevents re-fetch on same page navigation
    gcTime: 1000 * 60, // Keep in cache for 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });
}

/**
 * Today's attendance - more frequent updates
 */
export function useTodayAttendance() {
  return useQuery({
    queryKey: ["attendance", "today"] as const,
    queryFn: fetchTodayAttendance,
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60,
  });
}

/**
 * Punch attendance mutation - updates UI after successful API response
 */
export function usePunchAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PunchRequest) => {
      const response = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to punch attendance");
      }

      return response.json() as Promise<PunchResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "today"] });
    },
    onError: (error) => {
      console.error("Punch attendance failed:", error);
    },
  });
}

/**
 * Get attendance by ID
 */
export function useAttendanceById(attendanceId: string) {
  return useQuery({
    queryKey: ["attendance", "detail", attendanceId] as const,
    queryFn: async () => {
      const response = await fetch(`/api/admin/attendance/${attendanceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch attendance record");
      }
      return response.json();
    },
    enabled: !!attendanceId,
    staleTime: 0, // Always fetch fresh data
  });
}

/**
 * Update attendance - updates UI with response data only (no re-fetch)
 */
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update attendance");
      }

      return response.json() as Promise<{ attendance: AttendanceRecord }>;
    },
    // Update UI with response data - NO re-fetch, NO invalidation
    onSuccess: (response, variables) => {
      queryClient.setQueriesData<AttendanceResponse>(
        { queryKey: ["attendance", "list"], exact: false },
        (oldData: AttendanceResponse | undefined) => {
          if (!oldData?.records) return oldData;
          return {
            ...oldData,
            records: oldData.records.map((record) =>
              record.id === variables.attendanceId
                ? response.attendance
                : record,
            ),
          };
        },
      );
    },
    onError: (error) => {
      console.error("Failed to update attendance:", error);
    },
  });
}

/**
 * Update attendance status - updates UI with response data only (no re-fetch)
 */
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update attendance");
      }

      return response.json() as Promise<{ attendance: AttendanceRecord }>;
    },
    // Update UI with response data - NO re-fetch, NO invalidation
    onSuccess: (response, variables) => {
      queryClient.setQueriesData<AttendanceResponse>(
        { queryKey: ["attendance", "list"], exact: false },
        (oldData: AttendanceResponse | undefined) => {
          if (!oldData?.records) return oldData;
          return {
            ...oldData,
            records: oldData.records.map((record) =>
              record.id === variables.attendanceId
                ? response.attendance
                : record,
            ),
          };
        },
      );
    },
    onError: (error) => {
      console.error("Failed to update attendance status:", error);
    },
  });
}

/**
 * Attendance reports query
 */
export function useAttendanceReports(params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["attendance", "reports", params] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate)
        searchParams.set("startDate", String(params.startDate));
      if (params?.endDate) searchParams.set("endDate", String(params.endDate));
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const response = await fetch(
        `/api/admin/reports/attendance?${searchParams}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch attendance reports");
      }
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
  });
}

/**
 * Missing attendance query - faster loading with caching
 */
export function useMissingAttendance(params?: {
  date?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<MissingStaffResponse>({
    queryKey: ["attendance", "missing", params] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.date) searchParams.set("date", String(params.date));
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const response = await fetch(
        `/api/admin/attendance/missing?${searchParams}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch missing attendance");
      }
      return response.json() as Promise<MissingStaffResponse>;
    },
    staleTime: 0, // Always fetch fresh data when needed
    gcTime: 1000 * 60, // 2 minutes
  });
}

/**
 * Mark attendance for missing staff - updates UI after successful API response
 */
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date, status, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark attendance");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate all attendance-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      console.error("Mark attendance failed:", error);
    },
  });
}

/**
 * Manager attendance query
 */
export function useManagerAttendance(params?: {
  page?: number;
  limit?: number;
  date?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["attendance", "manager", params] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.date) searchParams.set("date", String(params.date));
      if (params?.status) searchParams.set("status", String(params.status));
      if (params?.search) searchParams.set("search", String(params.search));

      const response = await fetch(`/api/manager/attendance?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch manager attendance");
      }
      return response.json() as Promise<ManagerAttendanceResponse>;
    },
    staleTime: 0, // Always fetch fresh data
  });
}

/**
 * Update attendance status (approve/reject) - updates UI after successful API response
 */
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
      const response = await fetch(
        `/api/admin/attendance/${attendanceId}/update`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update attendance status");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Manually update the cache after API success
      queryClient.setQueriesData(
        { queryKey: ["attendance", "manager"], exact: false },
        (old: ManagerAttendanceResponse | undefined) => {
          if (!old?.records) return old;
          return {
            ...old,
            records: old.records.map((record) =>
              record.id === variables.attendanceId
                ? { ...record, status: variables.data.status }
                : record,
            ),
          };
        },
      );
    },
    onError: (err) => {
      console.error("Failed to update attendance status:", err);
    },
  });
}

/**
 * User-specific missing attendance query - for admin user attendance page
 */
export function useUserMissingAttendance(params: {
  userId: string;
  startDate: string;
  endDate: string;
}) {
  return useQuery<UserMissingAttendanceResponse>({
    queryKey: ["attendance", "userMissing", params] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("startDate", params.startDate);
      searchParams.set("endDate", params.endDate);

      const response = await fetch(
        `/api/admin/users/${params.userId}/missing-attendance?${searchParams}`,
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(
          errorData.error || "Failed to fetch user missing attendance",
        );
      }
      return response.json() as Promise<UserMissingAttendanceResponse>;
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60, // 1 minute cache
    enabled: !!(params.userId && params.startDate && params.endDate),
  });
}
