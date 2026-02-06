"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import AttendanceStatsCards from "@/components/admin/attendance/AttendanceStatsCards";
import AttendanceChart from "@/components/admin/attendance/AttendanceChart";
import AttendanceFilters from "@/components/admin/attendance/AttendanceFilters";
import AttendanceTable from "@/components/admin/attendance/AttendanceTable";
import { useAttendance, useUpdateAttendance, useUpdateStatus } from "@/hooks";

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

  // Search state - input value vs debounced value
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Track which rows are loading
  const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set());

  // Debounce logic - update debounced search after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      if (searchInput !== debouncedSearch) {
        setCurrentPage(1); // Reset to page 1 on search change
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  const {
    data: attendanceData,
    isLoading,
    isFetching,
    error: fetchError,
  } = useAttendance({
    page: currentPage,
    limit: pageLimit,
    status: statusFilter || undefined,
    date: startDate,
    search: debouncedSearch || undefined,
  });

  const updateStatus = useUpdateStatus();

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
            // Clear loading state after mutation completes
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
    (attendanceId: string, updates?: Record<string, unknown>) => {
      if (!updates) return;

      // Set loading state for this row
      setLoadingRows((prev) => new Set(prev).add(attendanceId));

      updateStatus.mutate(
        { attendanceId, data: updates as any },
        {
          onSettled: () => {
            // Clear loading state after mutation completes
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

  // Check if a row is loading
  const isRowLoading = useCallback(
    (attendanceId: string) => loadingRows.has(attendanceId),
    [loadingRows],
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
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <AttendanceStatsCards
            stats={attendanceData?.stats || null}
            loading={isLoading || isFetching}
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
            search={searchInput}
            setSearch={setSearchInput}
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
              loading={isLoading || isFetching}
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
