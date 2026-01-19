"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import AttendanceStatsCards from "@/components/admin/attendance/AttendanceStatsCards";
import AttendanceChart from "@/components/admin/attendance/AttendanceChart";
import AttendanceFilters from "@/components/admin/attendance/AttendanceFilters";
import AttendanceTable from "@/components/admin/attendance/AttendanceTable";
import {
  AttendanceRecord,
  AttendanceStats,
  AttendanceTrend,
} from "@/types/attendance";

export default function AdminAttendancePage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [dailyTrends, setDailyTrends] = useState<AttendanceTrend[]>([]);

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAttendance();
  }, [
    currentPage,
    statusFilter,
    startDate,
    endDate,
    pageLimit,
    sortBy,
    sortOrder,
  ]);
  useEffect(() => {}, []);

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageLimit.toString(),
        status: statusFilter,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/admin/attendance?${params}`);
      const data = await res.json();

      if (res.ok) {
        setRecords(data.records || []);
        setStats(data.stats);
        setTotalPages(data.pagination?.totalPages || 1);
        setStatusDistribution(data.charts?.statusDistribution || []);
        setDailyTrends(data.charts?.dailyTrends || []);
      } else {
        setError(data.error || "Failed to fetch attendance");
        setRecords([]);
        setTotalPages(1);
        setStatusDistribution([]);
        setDailyTrends([]);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      setError("Failed to fetch attendance");
      setRecords([]);
      setTotalPages(1);
      setStatusDistribution([]);
      setDailyTrends([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceAction = async (
    attendanceId: string,
    action: "APPROVE" | "REJECT" | "HALF_DAY",
  ) => {
    setActionLoading(attendanceId);
    try {
      let status: string;
      switch (action) {
        case "APPROVE":
          status = "APPROVED";
          break;
        case "REJECT":
          status = "REJECTED";
          break;

        default:
          status = "APPROVED";
      }

      const res = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          approvedBy: session?.user?.id,
        }),
      });

      if (res.ok) {
        await fetchAttendance(); // Refresh data
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update attendance");
      }
    } catch (error) {
      console.error("Failed to update attendance:", error);
      alert("Failed to update attendance");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMoreOptions = async (attendanceId: string, updates?: any) => {
    if (!updates) return;

    setActionLoading(attendanceId);
    try {
      const res = await fetch(`/api/admin/attendance/${attendanceId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await fetchAttendance(); // Refresh data
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update attendance details");
      }
    } catch (error) {
      console.error("Failed to update attendance details:", error);
      alert("Failed to update attendance details");
    } finally {
      setActionLoading(null);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  console.log("records", records);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
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
            <div className="flex items-center space-x-3">
              <Link
                href="/admin/attendance/missing"
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Check Missing</span>
              </Link>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                <span className="text-sm text-gray-600">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <AttendanceStatsCards stats={stats} loading={loading} />
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
          />

          {error && (
            <div className="mx-4 md:mx-6 mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 md:px-6 pb-6">
            <AttendanceTable
              records={records}
              loading={loading}
              actionLoading={actionLoading}
              onAttendanceAction={handleAttendanceAction}
              onMoreOptions={handleMoreOptions}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={pageLimit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
