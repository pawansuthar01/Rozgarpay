"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { XCircle } from "lucide-react";
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
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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
    action: "APPROVE" | "REJECT"
  ) => {
    setActionLoading(attendanceId);
    try {
      const res = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
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

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            ⏱ ATTENDANCE MANAGEMENT
          </h1>
          <p className="mt-2 text-gray-600">
            Manage company-wide attendance records
          </p>
        </div>
      </div>

      <AttendanceStatsCards stats={stats} loading={loading} />

      <AttendanceChart
        statusDistribution={statusDistribution}
        dailyTrends={dailyTrends}
        loading={loading}
      />

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
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
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <AttendanceTable
          records={records}
          loading={loading}
          actionLoading={actionLoading}
          onAttendanceAction={handleAttendanceAction}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={pageLimit}
        />
      </div>
    </div>
  );
}
