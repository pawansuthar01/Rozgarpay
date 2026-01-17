"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { XCircle } from "lucide-react";
import StaffStatsCards from "@/components/admin/staff/StaffStatsCards";
import AttendanceChart from "@/components/admin/staff/AttendanceChart";
import SalaryChart from "@/components/admin/staff/SalaryChart";
import StaffFilters from "@/components/admin/staff/StaffFilters";
import StaffTable from "@/components/admin/staff/StaffTable";
import {
  AttendanceTrend,
  SalaryDistribution,
  StaffMember,
  StaffStats,
} from "@/types/staff";

export default function AdminStaffPage() {
  const { data: session } = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attendanceTrends, setAttendanceTrends] = useState<AttendanceTrend[]>(
    []
  );
  const [salaryDistribution, setSalaryDistribution] =
    useState<SalaryDistribution>({ paid: 0, pending: 0, processing: 0 });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStaff();
  }, [currentPage, statusFilter, attendanceFilter, searchTerm]);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        status: statusFilter,
        attendanceStatus: attendanceFilter,
        search: searchTerm,
      });

      const res = await fetch(`/api/admin/staff?${params}`);
      const data = await res.json();

      if (res.ok) {
        setStaff(data.staff || []);
        setStats(data.stats);
        setTotalPages(data.pagination?.totalPages || 1);
        setAttendanceTrends(data.charts?.attendanceTrends || []);
        setSalaryDistribution(
          data.charts?.salaryDistribution || {
            paid: 0,
            pending: 0,
            processing: 0,
          }
        );
      } else {
        setError(data.error || "Failed to fetch staff");
        setStaff([]);
        setTotalPages(1);
        setAttendanceTrends([]);
        setSalaryDistribution({ paid: 0, pending: 0, processing: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      setError("Failed to fetch staff");
      setStaff([]);
      setTotalPages(1);
      setAttendanceTrends([]);
      setSalaryDistribution({ paid: 0, pending: 0, processing: 0 });
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
        await fetchStaff(); // Refresh data
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
            🧑‍💼 STAFF MANAGEMENT
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your staff attendance and performance
          </p>
        </div>
      </div>

      <StaffStatsCards stats={stats} loading={loading} />

      <AttendanceChart
        stats={stats}
        attendanceTrends={attendanceTrends}
        loading={loading}
      />

      <SalaryChart salaryDistribution={salaryDistribution} loading={loading} />

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <StaffFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          attendanceFilter={attendanceFilter}
          setAttendanceFilter={setAttendanceFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
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

        <StaffTable
          staff={staff}
          loading={loading}
          actionLoading={actionLoading}
          onAttendanceAction={handleAttendanceAction}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </div>
  );
}
