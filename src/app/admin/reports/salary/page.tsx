"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

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
  DollarSign,
  Users,
  TrendingUp,
  ChevronLeft,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useSalaryReports } from "@/hooks";

interface SalaryReport {
  totalPayout: number;
  staffCount: number;
  monthlyBreakdown: { month: string; amount: number }[];
  staffBreakdown: {
    userId: string;
    user: { firstName: string | null; lastName: string | null; email: string };
    totalAmount: number;
  }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

export default function AdminSalaryReportsPage() {
  const { data: session } = useSession();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Use the custom hook
  const {
    data: report,
    isLoading: loading,
    error: fetchError,
  } = useSalaryReports({
    startDate,
    endDate,
    page,
    limit,
  });

  const totalPages = report?.totalPages || 1;

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/admin/reports"
          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          aria-label="Back to reports"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Salary Reports
          </h1>
          <p className="mt-2 text-gray-600">
            Monthly payroll reports and staff salary breakdowns
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Items per page
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payout</p>
              {loading ? (
                <Skeleton height={36} width={100} />
              ) : (
                <p className="text-3xl font-bold text-green-600">
                  ₹{report?.totalPayout?.toLocaleString() || 0}
                </p>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Staff Count</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-blue-600">
                  {report?.staffCount || 0}
                </p>
              )}
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Average Payout
              </p>
              {loading ? (
                <Skeleton height={36} width={80} />
              ) : (
                <p className="text-3xl font-bold text-purple-600">
                  ₹
                  {report?.staffCount
                    ? Math.round(
                        (report.totalPayout || 0) / report.staffCount,
                      ).toLocaleString()
                    : 0}
                </p>
              )}
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Salary Status Distribution
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report?.statusDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(report?.statusDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Salary Breakdown
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report?.monthlyBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Legend />
                  <Bar dataKey="amount" fill="#8884d8" name="Total Amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Staff Breakdown */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Staff-wise Salary Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
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
                        <Skeleton height={16} width={80} />
                      </td>
                    </tr>
                  ))
                : report?.staffBreakdown.map((staff) => (
                    <tr key={staff.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {staff.user.firstName} {staff.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {staff.user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{staff.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              aria-label="Next page"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
