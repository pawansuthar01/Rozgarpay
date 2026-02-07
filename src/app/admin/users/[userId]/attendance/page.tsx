"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";
import type { User as UserType } from "next-auth";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  AlertTriangle,
  X,
  ClockIcon,
} from "lucide-react";
import { formatDate, formatLocalDate, formatTime } from "@/lib/utils";
import AttendancePDFGenerator from "@/components/AttendancePDFGenerator";
import {
  useAttendance,
  useUpdateStatus,
  useUpdateAttendance,
  useMarkAttendance,
  useUserMissingAttendance,
} from "@/hooks";
import { AttendanceRecord } from "@/types/attendance";
import AttendanceMoreOptionsModal from "@/components/admin/attendance/AttendanceMoreOptionsModal";

// PDF Generator expects this interface
interface PDFRecord {
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

interface PDFData {
  user: {
    firstName: string | null;
    lastName: string | null;
    phone?: string | null;
  } | null;
  records: PDFRecord[];
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalHours: number;
  };
}

export default function UserAttendancePage() {
  const { data: session } = useSession();
  const params = useParams();
  const userId = params.userId as string;
  const [selectedImage, setSelectedImage] = useState<null | string>("");
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() - 2);
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return formatLocalDate(today);
  });
  const [pageLimit, setPageLimit] = useState<number>(10);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Missing attendance pagination
  const [missingPage, setMissingPage] = useState(1);
  const [missingLimit] = useState(5);

  // Track which rows are loading
  const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] =
    useState<AttendanceRecord | null>(null);

  // Missing attendance state
  const [markingAttendance, setMarkingAttendance] = useState<Set<string>>(
    new Set(),
  );

  const {
    data: attendanceData,
    isLoading,
    isFetching,
    error: fetchError,
  } = useAttendance({
    page: currentPage,
    limit: pageLimit,
    userId: userId,
    startDate: startDate,
    endDate: endDate,
    status: statusFilter || undefined,
  });

  const updateStatus = useUpdateStatus();
  const useUpdate = useUpdateAttendance();
  const markAttendanceMutation = useMarkAttendance();

  // Fetch missing attendance data using hook
  const {
    data: missingData,
    isLoading: missingLoading,
    refetch: refetchMissing,
  } = useUserMissingAttendance({
    userId,
    startDate,
    endDate,
  });

  // Transform records for PDF generator
  const transformToPDFRecords = useCallback(
    (records: AttendanceRecord[]): PDFRecord[] => {
      return records.map((record) => ({
        id: record.id,
        attendanceDate: record.attendanceDate,
        punchIn: record.punchIn,
        punchOut: record.punchOut,
        status: record.status,
        workingHours: record.workingHours || 0,
        isLate: record.LateMinute ? record.LateMinute > 0 : false,
        isLateMinutes: record.LateMinute,
        overtimeHours: record.overtimeHours || 0,
        shiftDurationHours: record.shiftDurationHours,
      }));
    },
    [],
  );

  // Create PDF data
  const pdfData: PDFData = {
    user: attendanceData?.records[0]?.user || null,
    records: attendanceData?.records
      ? transformToPDFRecords(attendanceData.records)
      : [],
    summary: {
      totalDays:
        (attendanceData?.pagination?.total || 0) +
        (missingData?.missingDays || 0),
      presentDays: attendanceData?.stats?.approved || 0,
      absentDays: attendanceData?.stats?.absent || 0,
      lateDays: 0,
      totalHours: 0,
    },
  };

  const handleAttendanceAction = useCallback(
    (
      attendanceId: string,
      action: "APPROVE" | "REJECT" | "HALF_DAY" | "ABSENT" | "LEAVE",
    ) => {
      let status: "APPROVED" | "REJECTED" | "ABSENT" | "LEAVE";

      switch (action) {
        case "APPROVE":
          status = "APPROVED";
          break;
        case "REJECT":
          status = "REJECTED";
          break;
        case "ABSENT":
          status = "ABSENT";
          break;
        case "LEAVE":
          status = "LEAVE";
          break;
        default:
          status = "APPROVED";
      }

      // Set loading state for this row
      setLoadingRows((prev) => new Set(prev).add(attendanceId));

      updateStatus.mutate(
        { attendanceId, data: { status } },
        {
          onSettled: () => {
            setLoadingRows((prev) => {
              const next = new Set(prev);
              next.delete(attendanceId);
              return next;
            });
          },
        },
      );
    },
    [updateStatus],
  );

  const handleMoreOptions = useCallback(
    (attendanceId: string) => {
      const attendance = attendanceData?.records.find(
        (r) => r.id === attendanceId,
      );
      if (attendance) {
        setSelectedAttendance(attendance);
        setModalOpen(true);
      }
    },
    [attendanceData],
  );

  const handleSaveMoreOptions = useCallback(
    async (attendanceId: string, updates: any) => {
      setLoadingRows((prev) => new Set(prev).add(attendanceId));

      useUpdate.mutate(
        { attendanceId, data: updates },
        {
          onSettled: () => {
            setLoadingRows((prev) => {
              const next = new Set(prev);
              next.delete(attendanceId);
              return next;
            });
          },
        },
      );
    },
    [useUpdate],
  );

  // Mark missing attendance
  const handleMarkMissingAttendance = useCallback(
    async (
      date: string,
      status: "APPROVED" | "ABSENT" | "LEAVE" = "APPROVED",
    ) => {
      setMarkingAttendance((prev) => new Set(prev).add(date));

      try {
        await markAttendanceMutation.mutateAsync({
          userId,
          date,
          status,
          reason: "Manual entry from user attendance page",
        });

        // Refresh missing data using hook refetch
        await refetchMissing();
      } catch (error) {
        console.error("Error marking attendance:", error);
      } finally {
        setMarkingAttendance((prev) => {
          const next = new Set(prev);
          next.delete(date);
          return next;
        });
      }
    },
    [userId, markAttendanceMutation, refetchMissing],
  );

  // Check if a row is loading
  const isRowLoading = useCallback(
    (attendanceId: string) => loadingRows.has(attendanceId),
    [loadingRows],
  );

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
        };
      case "PENDING":
        return {
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
        };
      case "REJECTED":
        return {
          color: "bg-red-100 text-red-800",
          icon: XCircle,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          icon: Clock,
        };
    }
  };

  // Get user info from first record
  const userInfo = attendanceData?.records[0]?.user;

  // Paginated missing dates
  const missingTotalPages = Math.ceil(
    (missingData?.missingDates.length || 0) / missingLimit,
  );
  const paginatedMissingDates =
    missingData?.missingDates.slice(
      (missingPage - 1) * missingLimit,
      missingPage * missingLimit,
    ) || [];

  const handleDownloadReport = () => {
    if (!attendanceData?.records && !missingData?.missingDates.length) return;

    const headers = [
      "Date",
      "Punch In",
      "Punch Out",
      "Status",
      "Working Hours",
    ];
    const csvContent = [
      headers.join(","),
      ...(attendanceData?.records || []).map((record) =>
        [
          new Date(record.attendanceDate).toLocaleDateString(),
          record.punchIn ? new Date(record.punchIn).toLocaleTimeString() : "-",
          record.punchOut
            ? new Date(record.punchOut).toLocaleTimeString()
            : "-",
          record.status,
          record.workingHours ? `${record.workingHours?.toFixed(2)} hrs` : "-",
        ].join(","),
      ),
      // Add missing dates
      ...(missingData?.missingDates || []).map((missing) =>
        [
          new Date(missing.date).toLocaleDateString(),
          "-",
          "-",
          "MISSING",
          "-",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${userId}_${startDate}_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

  const totalPages = attendanceData?.pagination?.totalPages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto  sm:px-4 lg:px-6  md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link
              href={`/admin/users/${userId}`}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                Attendance Records
              </h1>
              {userInfo && (
                <p className="text-sm text-gray-600">
                  {userInfo.firstName} {userInfo.lastName} - {userInfo.phone}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-2">
              <button
                onClick={handleDownloadReport}
                disabled={
                  !attendanceData?.records?.length &&
                  !missingData?.missingDates.length
                }
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2 text-sm"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              {attendanceData?.records && attendanceData.records.length > 0 && (
                <AttendancePDFGenerator
                  data={pdfData}
                  month={new Date(startDate).getMonth() + 1}
                  year={new Date(startDate).getFullYear()}
                  companyName="PayRollBook"
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">PDF</span>
                </AttendancePDFGenerator>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                  setMissingPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                  setMissingPage(1);
                }}
                max={formatLocalDate(new Date())}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">Leave</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Per Page
              </label>
              <select
                value={pageLimit}
                onChange={(e) => {
                  setPageLimit(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-600">Total Days</p>
            <p className="text-xl font-bold text-gray-900">
              {missingLoading
                ? "..."
                : (attendanceData?.pagination?.total || 0) +
                  (missingData?.missingDays || 0)}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-600">Present</p>
            <p className="text-xl font-bold text-green-600">
              {missingLoading ? "..." : attendanceData?.stats?.approved || 0}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-600">Absent</p>
            <p className="text-xl font-bold text-red-600">
              {missingLoading ? "..." : attendanceData?.stats?.absent || 0}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-600">Missing</p>
            <p className="text-xl font-bold text-orange-600">
              {missingLoading ? "..." : missingData?.missingDays || 0}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-600">Leave</p>
            <p className="text-xl font-bold text-blue-600">
              {missingLoading ? "..." : attendanceData?.stats?.leave || 0}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {fetchError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              Failed to load attendance records. Please try again.
            </p>
          </div>
        )}

        {/* Missing Attendance Section */}
        {missingLoading ? (
          <div className="mb-4 bg-orange-50 rounded-lg shadow-sm border border-orange-200 p-4">
            <div className="animate-pulse space-y-3">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-orange-200 rounded"></div>
                <div className="h-4 w-48 bg-orange-200 rounded"></div>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-orange-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ) : missingData && missingData.missingDates.length > 0 ? (
          <div className="mb-4 bg-orange-50 rounded-lg shadow-sm border border-orange-200 overflow-hidden">
            <div className="px-3 py-3 bg-orange-100 border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h3 className="text-sm font-semibold text-orange-800">
                    Missing Attendance ({missingData.missingDates.length})
                  </h3>
                </div>
                {missingTotalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setMissingPage(Math.max(1, missingPage - 1))
                      }
                      disabled={missingPage === 1}
                      className="p-1 rounded hover:bg-orange-200 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4 text-orange-700" />
                    </button>
                    <span className="text-xs text-orange-700">
                      {missingPage} / {missingTotalPages}
                    </span>
                    <button
                      onClick={() =>
                        setMissingPage(
                          Math.min(missingTotalPages, missingPage + 1),
                        )
                      }
                      disabled={missingPage === missingTotalPages}
                      className="p-1 rounded hover:bg-orange-200 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4 text-orange-700" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="divide-y divide-orange-200">
              {paginatedMissingDates.map((missing) => (
                <div
                  key={missing.date}
                  className="px-3 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {missing.formattedDate}
                      </p>
                      <p className="text-xs text-gray-500">
                        No attendance marked
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        handleMarkMissingAttendance(missing.date, "APPROVED")
                      }
                      disabled={markingAttendance.has(missing.date)}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1"
                    >
                      {markingAttendance.has(missing.date) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      <span>Present</span>
                    </button>
                    <button
                      onClick={() =>
                        handleMarkMissingAttendance(missing.date, "ABSENT")
                      }
                      disabled={markingAttendance.has(missing.date)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 flex items-center space-x-1"
                    >
                      {markingAttendance.has(missing.date) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      <span>Absent</span>
                    </button>
                    <button
                      onClick={() =>
                        handleMarkMissingAttendance(missing.date, "LEAVE")
                      }
                      disabled={markingAttendance.has(missing.date)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                    >
                      {markingAttendance.has(missing.date) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span className="text-xs">
                          <ClockIcon className="h-3 w-3" />
                        </span>
                      )}
                      <span>Leave</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Punch In
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Punch Out
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ot
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isFetching ? (
                  Array.from({ length: pageLimit }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                ) : attendanceData?.records?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  attendanceData?.records?.map((record) => {
                    const statusInfo = getStatusInfo(record.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(record.attendanceDate)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>
                              {record.punchIn
                                ? formatTime(record.punchIn)
                                : "-"}
                            </span>
                            {/* @ts-ignore - punchInImageUrl exists in the record */}
                            {record.punchInImageUrl && (
                              <button
                                onClick={() =>
                                  setSelectedImage(
                                    record?.punchInImageUrl || null,
                                  )
                                }
                                className="text-blue-600 hover:text-blue-800"
                                title="View punch in image"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>
                              {record.punchOut
                                ? formatTime(record.punchOut)
                                : "-"}
                            </span>
                            {/* @ts-ignore - punchOutImageUrl exists in the record */}
                            {record.punchOutImageUrl && (
                              <button
                                onClick={() =>
                                  setSelectedImage(
                                    record?.punchInImageUrl || null,
                                  )
                                }
                                className="text-blue-600 hover:text-blue-800"
                                title="View punch out image"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <StatusIcon className="h-4 w-4 mr-2" />
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}
                            >
                              {record.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.workingHours
                            ? `${record.workingHours.toFixed(2)}h`
                            : "-"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.overtimeHours
                            ? `${record.overtimeHours.toFixed(2)}h`
                            : "-"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-1">
                            {record.status !== "APPROVED" && (
                              <button
                                onClick={() =>
                                  handleAttendanceAction(record.id, "APPROVE")
                                }
                                disabled={isRowLoading(record.id)}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 border border-green-600 px-2 py-1 rounded text-xs flex items-center"
                                title="Approve"
                              >
                                {isRowLoading(record.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                              </button>
                            )}
                            {record.status !== "REJECTED" && (
                              <button
                                onClick={() =>
                                  handleAttendanceAction(record.id, "REJECT")
                                }
                                disabled={
                                  isRowLoading(record.id) ||
                                  record.status === "APPROVED"
                                }
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 border border-red-600 px-2 py-1 rounded text-xs flex items-center"
                                title="Reject"
                              >
                                {isRowLoading(record.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                              </button>
                            )}
                            {record.status !== "ABSENT" && (
                              <button
                                onClick={() =>
                                  handleAttendanceAction(record.id, "ABSENT")
                                }
                                disabled={isRowLoading(record.id)}
                                className="text-orange-600 hover:text-orange-900 disabled:opacity-50 border border-orange-600 px-2 py-1 rounded text-xs flex items-center"
                                title="Mark Absent"
                              >
                                {isRowLoading(record.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <span className="text-xs">A</span>
                                )}
                              </button>
                            )}
                            {record.status !== "LEAVE" && (
                              <button
                                onClick={() =>
                                  handleAttendanceAction(record.id, "LEAVE")
                                }
                                disabled={isRowLoading(record.id)}
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50 border border-blue-600 px-2 py-1 rounded text-xs flex items-center"
                                title="Mark Leave"
                              >
                                {isRowLoading(record.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <span className="text-xs">L</span>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleMoreOptions(record.id)}
                              disabled={isRowLoading(record.id)}
                              className="text-gray-600 hover:text-gray-900 border border-gray-600 px-2 py-1 rounded text-xs flex items-center"
                              title="More options"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {selectedImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="relative max-w-2xl max-h-screen p-4">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                >
                  <X className="h-6 w-6" />
                </button>
                <img
                  src={selectedImage}
                  alt="Attendance proof"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            </div>
          )}
          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {attendanceData?.records?.length || 0} of{" "}
                {attendanceData?.pagination?.total || 0} records
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {isFetching ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>
              </div>
            ))
          ) : attendanceData?.records?.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
              No attendance records found
            </div>
          ) : (
            attendanceData?.records?.map((record) => {
              const statusInfo = getStatusInfo(record.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={record.id}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(record.attendanceDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(record.attendanceDate).toLocaleDateString(
                          "en-US",
                          { weekday: "long" },
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <StatusIcon className="h-4 w-4 mr-1" />
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-gray-500">Punch In</p>
                      <p className="font-medium flex items-center gap-2">
                        {record.punchIn ? formatTime(record.punchIn) : "-"}
                        {/* @ts-ignore - punchInImageUrl exists in the record */}
                        {record.punchInImageUrl && (
                          <button
                            onClick={() =>
                              window.open(
                                // @ts-ignore
                                record.punchInImageUrl,
                                "_blank",
                              )
                            }
                            className="text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Punch Out</p>
                      <p className="font-medium flex items-center gap-2">
                        {record.punchOut ? formatTime(record.punchOut) : "-"}
                        {/* @ts-ignore - punchOutImageUrl exists in the record */}
                        {record.punchOutImageUrl && (
                          <button
                            onClick={() =>
                              window.open(
                                // @ts-ignore
                                record.punchOutImageUrl,
                                "_blank",
                              )
                            }
                            className="text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Hours</p>
                      <p className="font-medium">
                        {record.workingHours
                          ? `${record.workingHours.toFixed(2)}h`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {record.status !== "APPROVED" && (
                      <button
                        onClick={() =>
                          handleAttendanceAction(record.id, "APPROVE")
                        }
                        disabled={isRowLoading(record.id)}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50 border border-green-600 px-2 py-1 rounded text-xs flex items-center"
                      >
                        {isRowLoading(record.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        Approve
                      </button>
                    )}
                    {record.status !== "REJECTED" && (
                      <button
                        onClick={() =>
                          handleAttendanceAction(record.id, "REJECT")
                        }
                        disabled={
                          isRowLoading(record.id) ||
                          record.status === "APPROVED"
                        }
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 border border-red-600 px-2 py-1 rounded text-xs flex items-center"
                      >
                        {isRowLoading(record.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        Reject
                      </button>
                    )}
                    {record.status !== "ABSENT" && (
                      <button
                        onClick={() =>
                          handleAttendanceAction(record.id, "ABSENT")
                        }
                        disabled={isRowLoading(record.id)}
                        className="text-orange-600 hover:text-orange-900 disabled:opacity-50 border border-orange-600 px-2 py-1 rounded text-xs flex items-center"
                      >
                        {isRowLoading(record.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span className="mr-1">A</span>
                        )}
                        Absent
                      </button>
                    )}
                    {record.status !== "LEAVE" && (
                      <button
                        onClick={() =>
                          handleAttendanceAction(record.id, "LEAVE")
                        }
                        disabled={isRowLoading(record.id)}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50 border border-blue-600 px-2 py-1 rounded text-xs flex items-center"
                      >
                        {isRowLoading(record.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span className="mr-1">L</span>
                        )}
                        Leave
                      </button>
                    )}
                    <button
                      onClick={() => handleMoreOptions(record.id)}
                      disabled={isRowLoading(record.id)}
                      className="text-gray-600 hover:text-gray-900 border border-gray-600 px-2 py-1 rounded text-xs flex items-center"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Mobile Pagination */}
          {attendanceData?.records?.length !== 0 && (
            <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* More Options Modal */}
        <AttendanceMoreOptionsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          attendance={selectedAttendance}
          onSave={handleSaveMoreOptions}
        />
      </div>
    </div>
  );
}
