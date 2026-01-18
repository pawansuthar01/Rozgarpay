"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

interface DailySummary {
  date: string;
  totalStaff: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

interface StaffAttendance {
  id: string;
  name: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendanceRate: number;
  lastAttendance: string | null;
}

export default function AttendanceReports() {
  const { data: session } = useSession();
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchReports();
    }
  }, [dateFrom, dateTo, currentPage]);

  const fetchReports = () => {
    setLoading(true);
    const params = new URLSearchParams({
      dateFrom,
      dateTo,
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
    });

    Promise.all([
      fetch(`/api/manager/reports/attendance/daily?${params}`),
      fetch(`/api/manager/reports/attendance/staff?${params}`),
    ])
      .then(async ([dailyRes, staffRes]) => {
        const [dailyData, staffData] = await Promise.all([
          dailyRes.json(),
          staffRes.json(),
        ]);

        setDailySummary(dailyData.summary || []);
        setStaffAttendance(staffData.staff || []);
        setTotalPages(staffData.totalPages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  if (!session || session.user.role !== "MANAGER") {
    return <div>Access Denied</div>;
  }

  const overallStats =
    dailySummary.length > 0
      ? {
          totalDays: dailySummary.length,
          avgAttendance:
            dailySummary.reduce((sum, day) => sum + day.attendanceRate, 0) /
            dailySummary.length,
          totalPresent: dailySummary.reduce((sum, day) => sum + day.present, 0),
          totalAbsent: dailySummary.reduce((sum, day) => sum + day.absent, 0),
          totalLate: dailySummary.reduce((sum, day) => sum + day.late, 0),
        }
      : null;

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Attendance Reports
          </h1>
          <p className="mt-2 text-gray-600">
            Detailed attendance analytics and staff performance metrics.
          </p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Date Range
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReports}
              disabled={!dateFrom || !dateTo || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      {overallStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Days</p>
                <p className="text-3xl font-bold text-gray-900">
                  {overallStats.totalDays}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Attendance
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(overallStats.avgAttendance)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Present
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {overallStats.totalPresent}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Absent
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {overallStats.totalAbsent}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Daily Attendance Summary */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Daily Attendance Summary
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Absent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Late
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading
                ? Array.from({ length: 7 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={100} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={80} />
                      </td>
                    </tr>
                  ))
                : dailySummary.map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {day.present}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {day.absent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                        {day.late}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Math.round(day.attendanceRate)}%
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff-wise Attendance */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Staff-wise Attendance
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Absent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Late
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading
                ? Array.from({ length: itemsPerPage }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={120} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={80} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={24} width={80} />
                      </td>
                    </tr>
                  ))
                : staffAttendance.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {staff.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {staff.totalDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {staff.presentDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {staff.absentDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                        {staff.lateDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {Math.round(staff.attendanceRate)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {staff.attendanceRate >= 90 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Good
                          </span>
                        ) : staff.attendanceRate >= 75 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Average
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Poor
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
            >
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
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
