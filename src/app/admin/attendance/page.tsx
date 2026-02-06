"use client";

import { useSession } from "next-auth/react";

import { useState, useCallback, useRef } from "react";
import { XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import AttendanceStatsCards from "@/components/admin/attendance/AttendanceStatsCards";
import AttendanceChart from "@/components/admin/attendance/AttendanceChart";
import AttendanceFilters from "@/components/admin/attendance/AttendanceFilters";
import AttendanceTable from "@/components/admin/attendance/AttendanceTable";
import { useDebounce } from "@/lib/hooks";
import { useAttendance, useUpdateAttendance, useUpdateStatus } from "@/hooks";
import Loading from "@/components/ui/Loading";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminAttendancePage() {
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [pageLimit, setPageLimit] = useState<number>(5);
  const [sortBy, setSortBy] = useState<string>("attendanceDate");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 500);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Use the custom hooks
  const {
    data: attendanceData,
    isLoading: loading,
    error: fetchError,
  } = useAttendance({
    page: currentPage,
    limit: pageLimit,
    status: statusFilter || undefined,
    date: startDate,
  });

  const updateAttendanceMutation = useUpdateAttendance();
  const updateStatus = useUpdateStatus();

  // Track loading state with ref and timeout - no re-renders needed
  const loadingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Check if a row is loading
  const isRowLoading = useCallback((attendanceId: string) => {
    return loadingRef.current.has(attendanceId);
  }, []);

  // Force re-render only when needed (when loading state changes)
  const [, forceUpdate] = useState(0);
  const triggerUpdate = useCallback(() => {
    forceUpdate((t) => t + 1);
  }, []);

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

      // Set loading state - show loading on button
      const existingTimeout = loadingRef.current.get(attendanceId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Short timeout as fallback for slow API responses
      loadingRef.current.set(
        attendanceId,
        setTimeout(() => {
          loadingRef.current.delete(attendanceId);
          triggerUpdate();
        }, 500),
      );
      triggerUpdate();

      // Call API - status will update optimistically after response
      updateStatus.mutate(
        { attendanceId, data: { status } },
        {
          onSettled: () => {
            const timeout = loadingRef.current.get(attendanceId);
            if (timeout) {
              clearTimeout(timeout);
              loadingRef.current.delete(attendanceId);
              triggerUpdate();
            }
          },
        },
      );
    },
    [updateStatus, triggerUpdate],
  );

  const handleMoreOptions = useCallback(
    (attendanceId: string, updates?: Record<string, unknown>) => {
      if (!updates) return;

      const existingTimeout = loadingRef.current.get(attendanceId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      loadingRef.current.set(
        attendanceId,
        setTimeout(() => {
          loadingRef.current.delete(attendanceId);
          triggerUpdate();
        }, 1000),
      );
      triggerUpdate();

      updateAttendanceMutation.mutate(
        { attendanceId, data: updates },
        {
          onSettled: () => {
            const timeout = loadingRef.current.get(attendanceId);
            if (timeout) {
              clearTimeout(timeout);
              loadingRef.current.delete(attendanceId);
              triggerUpdate();
            }
          },
        },
      );
    },
    [updateAttendanceMutation, triggerUpdate],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto  sm:px-6 lg:px-8 py-2 md:py-8">
        {/* Header */}
        <div className="mb-3 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 hidden md:flex sm:mb-0">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <span className="text-white text-xl">⏱</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Attendance Management
                  </h1>
                  <p className="mt-1 text-sm md:text-base text-gray-600">
                    Monitor and manage company-wide attendance records
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end items-center space-x-3">
              <Link
                href="/admin/attendance/missing"
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Check Missing</span>
              </Link>
              <div className="bg-white  hidden md:flex px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                <span className="text-sm text-gray-600">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <AttendanceStatsCards
            stats={attendanceData?.stats || null}
            loading={loading}
          />
        </div>

        {/* Records Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <AttendanceFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            pageLimit={pageLimit}
            setPageLimit={setPageLimit}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            search={search}
            setSearch={setSearch}
          />

          {fetchError && (
            <div className="mx-4 md:mx-6 mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      Failed to load attendance records. Please try again.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 md:px-6 pb-6">
            <AttendanceTable
              records={attendanceData?.records || []}
              loading={loading}
              isRowLoading={isRowLoading}
              onAttendanceAction={handleAttendanceAction}
              onMoreOptions={handleMoreOptions}
              currentPage={currentPage}
              totalPages={attendanceData?.pagination?.totalPages || 1}
              onPageChange={setCurrentPage}
              itemsPerPage={pageLimit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
