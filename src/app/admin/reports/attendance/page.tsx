"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  Clock,
  XCircle,
  ChevronLeft,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useAttendanceReports } from "@/hooks/useAttendance";

interface AttendanceReport {
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  trends: { date: string; present: number; absent: number; late: number }[];
  staffSummary: {
    userId: string;
    user: { firstName: string | null; lastName: string | null; email: string };
    present: number;
    absent: number;
    late: number;
  }[];
}

export default function AdminAttendanceReportsPage() {
  const { data: session } = useSession();
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Use the custom hook
  const {
    data: report,
    isLoading: loading,
    error: fetchError,
  } = useAttendanceReports({
    startDate,
    endDate,
    page,
    limit,
  });

  const totalPages = report?.totalPages || 1;

  const statusData = report
    ? [
        { name: "Present", value: report.present, color: "#10B981" },
        { name: "Absent", value: report.absent, color: "#EF4444" },
        { name: "Late", value: report.late, color: "#F59E0B" },
      ]
    : [];

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/admin/reports"
              className="p-3 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              aria-label="Back to reports"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Attendance Reports
                </h1>
                <p className="mt-1 text-sm md:text-base text-gray-600">
                  Detailed attendance analytics and summaries
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Report Filters
            </h3>
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items per page
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 md:p-6 rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-blue-700 mb-1">
                  Total Records
                </p>
                {loading ? (
                  <Skeleton height={28} width={40} />
                ) : (
                  <p className="text-2xl md:text-3xl font-bold text-blue-900">
                    {report?.totalRecords || 0}
                  </p>
                )}
              </div>
              <div className="bg-blue-200 p-2 md:p-3 rounded-lg">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 md:p-6 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-green-700 mb-1">
                  Present
                </p>
                {loading ? (
                  <Skeleton height={28} width={40} />
                ) : (
                  <p className="text-2xl md:text-3xl font-bold text-green-900">
                    {report?.present || 0}
                  </p>
                )}
              </div>
              <div className="bg-green-200 p-2 md:p-3 rounded-lg">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 md:p-6 rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-red-700 mb-1">
                  Late/Absent
                </p>
                {loading ? (
                  <Skeleton height={28} width={40} />
                ) : (
                  <p className="text-2xl md:text-3xl font-bold text-red-900">
                    {(report?.absent || 0) + (report?.late || 0)}
                  </p>
                )}
              </div>
              <div className="bg-red-200 p-2 md:p-3 rounded-lg">
                <XCircle className="h-5 w-5 md:h-6 md:w-6 text-red-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Status Distribution
              </h3>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Overview
              </div>
            </div>
            {loading ? (
              <Skeleton height={250} className="rounded-lg" />
            ) : (
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "10px" }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Daily Trends
              </h3>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Last 7 days
              </div>
            </div>
            {loading ? (
              <Skeleton height={250} className="rounded-lg" />
            ) : (
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report?.trends || []}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="present"
                      fill="#10B981"
                      name="Present"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="absent"
                      fill="#EF4444"
                      name="Absent"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="late"
                      fill="#F59E0B"
                      name="Late"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Staff Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Staff-wise Summary
            </h3>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading
                  ? Array.from({ length: limit }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={120} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={40} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={40} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={40} />
                        </td>
                      </tr>
                    ))
                  : report?.staffSummary.map(
                      (staff: AttendanceReport["staffSummary"][0]) => (
                        <tr key={staff.userId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {staff.user.firstName} {staff.user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {staff.user.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staff.present}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staff.absent}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staff.late}
                          </td>
                        </tr>
                      ),
                    )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {loading
              ? Array.from({ length: limit }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton height={20} width={150} className="mb-2" />
                    <Skeleton height={16} width={100} className="mb-3" />
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton height={16} width={30} />
                      <Skeleton height={16} width={30} />
                      <Skeleton height={16} width={30} />
                    </div>
                  </div>
                ))
              : report?.staffSummary.map(
                  (staff: AttendanceReport["staffSummary"][0]) => (
                    <div
                      key={staff.userId}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            {staff.user.firstName} {staff.user.lastName}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {staff.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-green-600 font-semibold">
                            {staff.present}
                          </p>
                          <p className="text-xs text-gray-500">Present</p>
                        </div>
                        <div className="text-center">
                          <p className="text-red-600 font-semibold">
                            {staff.absent}
                          </p>
                          <p className="text-xs text-gray-500">Absent</p>
                        </div>
                        <div className="text-center">
                          <p className="text-yellow-600 font-semibold">
                            {staff.late}
                          </p>
                          <p className="text-xs text-gray-500">Late</p>
                        </div>
                      </div>
                    </div>
                  ),
                )}
          </div>

          {/* Pagination */}
          <div className="px-4 md:px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                <span className="font-medium">
                  {report?.staffSummary?.length || 0}
                </span>{" "}
                staff members on page{" "}
                <span className="font-medium">{page}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum =
                      Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pageNum === page
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronLeft className="h-4 w-4 ml-1 rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
