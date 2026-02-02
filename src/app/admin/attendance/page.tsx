"use client";

import { useSession } from "next-auth/react";

import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import AttendanceStatsCards from "@/components/admin/attendance/AttendanceStatsCards";
import AttendanceChart from "@/components/admin/attendance/AttendanceChart";
import AttendanceFilters from "@/components/admin/attendance/AttendanceFilters";
import AttendanceTable from "@/components/admin/attendance/AttendanceTable";
import { useDebounce } from "@/lib/hooks";
import { useAttendance, useUpdateAttendance, useUpdateStatus } from "@/hooks";
import Loading from "@/components/ui/Loading";

export default function AdminAttendancePage() {
  const { data: session } = useSession();

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
  const [pageLimit, setPageLimit] = useState<number>(10);
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
    date: startDate, // Using startDate as primary date filter
    // Note: The API might need additional date range parameters
  });

  const updateAttendanceMutation = useUpdateAttendance();
  const updateStatus = useUpdateStatus();

  const handleAttendanceAction = (
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

    updateStatus.mutate({
      attendanceId,
      data: { status },
    });
  };

  const handleMoreOptions = (attendanceId: string, updates?: any) => {
    if (!updates) return;

    updateAttendanceMutation.mutate({
      attendanceId,
      data: updates,
    });
  };

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

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
              actionLoading={
                updateStatus.isPending || updateAttendanceMutation.isPending
                  ? updateStatus.variables?.attendanceId ||
                    updateAttendanceMutation.variables?.attendanceId ||
                    null
                  : null
              }
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
