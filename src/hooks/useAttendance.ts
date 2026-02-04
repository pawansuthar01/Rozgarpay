import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { saveAttendance } from "@/lib/storageWorker";
import { performanceMonitor } from "@/lib/performanceMonitor";

// ============================================================================
// Types
// ============================================================================

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
  workingHours?: number;
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
};

// ============================================================================
// Stale Times (based on data volatility)
// ============================================================================

const STALE_TIMES = {
  LIST: 1000 * 60 * 2, // 2 minutes - changes occasionally
  TODAY: 1000 * 60 * 1, // 1 minute - changes frequently
  DETAIL: 1000 * 60 * 5, // 5 minutes - detailed data changes rarely
  REPORTS: 1000 * 60 * 5, // 5 minutes - reports are expensive
} as const;

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
 * Optimized attendance records query
 */
export function useAttendance(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  date?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["attendance", "list", params] as const,
    queryFn: () => fetchAttendance(params),
    staleTime: STALE_TIMES.LIST,
    gcTime: 1000 * 60 * 10,
    // Placeholder data for instant UI feedback while loading
    placeholderData: (previousData) =>
      previousData ?? {
        records: [],
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: 0,
          totalPages: 0,
        },
        stats: {
          totalRecords: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          absent: 0,
          leave: 0,
        },
        charts: {
          statusDistribution: [],
          dailyTrends: [],
        },
      },
  });
}

/**
 * Today's attendance - more frequent updates
 */
export function useTodayAttendance() {
  return useQuery({
    queryKey: ["attendance", "today"] as const,
    queryFn: fetchTodayAttendance,
    staleTime: STALE_TIMES.TODAY,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 60000, // Refetch every minute for active users
  });
}

/**
 * Punch attendance mutation with optimistic updates
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
    onMutate: async (newPunch) => {
      await queryClient.cancelQueries({ queryKey: ["attendance", "today"] });
      await queryClient.cancelQueries({ queryKey: ["attendance", "list"] });

      const previousToday = queryClient.getQueryData(["attendance", "today"]);

      queryClient.setQueryData(
        ["attendance", "today"],
        (old: TodayAttendanceResponse | undefined) => {
          if (!old) return old;

          if (newPunch.type === "IN") {
            return {
              ...old,
              hasPunchedIn: true,
              punchInTime: new Date().toISOString(),
            };
          } else {
            return {
              ...old,
              hasPunchedOut: true,
              punchOutTime: new Date().toISOString(),
            };
          }
        },
      );

      return { previousToday };
    },
    onError: (error, variables, context) => {
      if (context?.previousToday) {
        queryClient.setQueryData(
          ["attendance", "today"],
          context.previousToday,
        );
      }
      console.error("Punch attendance failed:", error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "list"] });
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
    staleTime: STALE_TIMES.DETAIL,
  });
}

/**
 * Update attendance mutation
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
    onMutate: async ({ attendanceId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["attendance", "list"] });

      // Snapshot the previous value
      const previousList = queryClient.getQueryData(["attendance", "list"]);

      // Optimistically update to the new value
      queryClient.setQueriesData(
        { queryKey: ["attendance", "list"] },
        (oldData: AttendanceResponse | undefined) => {
          if (!oldData?.records) return oldData;
          return {
            ...oldData,
            records: oldData.records.map((record) =>
              record.id === attendanceId ? { ...record, ...data } : record,
            ),
          };
        },
      );

      return { previousList };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(["attendance", "list"], context.previousList);
      }
    },
    onSettled: () => {
      // Don't invalidate - we already updated optimistically
      // If you need to sync with server, uncomment below:
      // queryClient.invalidateQueries({ queryKey: ["attendance", "list"] });
    },
  });
}

/**
 * Update attendance status - updates AFTER API response
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
    onSettled: () => {
      // Refetch after API response to update UI
      queryClient.invalidateQueries({ queryKey: ["attendance", "list"] });
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
    staleTime: STALE_TIMES.REPORTS,
  });
}

/**
 * Missing attendance query
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
  });
}

/**
 * Mark attendance for missing staff
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "missing"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "list"] });
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
    staleTime: STALE_TIMES.LIST,
  });
}

/**
 * Update attendance status (approve/reject)
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
      const response = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update attendance status");
      }

      return response.json();
    },
    onMutate: async ({ attendanceId, data }) => {
      await queryClient.cancelQueries({ queryKey: ["attendance", "manager"] });

      const previousAttendance = queryClient.getQueryData([
        "attendance",
        "manager",
      ]);

      queryClient.setQueryData(
        ["attendance", "manager"],
        (old: ManagerAttendanceResponse | undefined) => {
          if (!old?.records) return old;
          return {
            ...old,
            records: old.records.map((record) =>
              record.id === attendanceId
                ? { ...record, status: data.status }
                : record,
            ),
          };
        },
      );

      return { previousAttendance };
    },
    onError: (err, variables, context) => {
      if (context?.previousAttendance) {
        queryClient.setQueryData(
          ["attendance", "manager"],
          context.previousAttendance,
        );
      }
      console.error("Failed to update attendance status:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "manager"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "list"] });
    },
  });
}
