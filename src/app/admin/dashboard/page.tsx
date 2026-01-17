"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import OnboardingModal from "@/components/OnboardingModal";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Activity,
  UserPlus,
  CheckSquare,
  ArrowRight,
} from "lucide-react";

interface DashboardStats {
  totalStaff: number;
  todaysAttendance: {
    present: number;
    absent: number;
    pending: number;
  };
  monthlySalarySummary: {
    totalPaid: number;
    pending: number;
  };
  recentActivities: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
  }>;
}

export default function AdminDashboard() {
  const { data: session, update } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if onboarding should be shown
    if (session?.user && !session.user.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [session]);

  useEffect(() => {
    // Fetch dashboard stats
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch audit logs
    fetchAuditLogs();
  }, [currentPage, filter]);

  const fetchAuditLogs = () => {
    setAuditLoading(true);
    fetch(`/api/admin/audit-logs?page=${currentPage}&filter=${filter}`)
      .then((res) => res.json())
      .then((data) => {
        setAuditLogs(data.logs);
        setAuditLoading(false);
      })
      .catch(() => setAuditLoading(false));
  };

  const handleOnboardingComplete = async () => {
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setShowOnboarding(false);
      // Update session to reflect onboarding completion
      await update({
        onboardingCompleted: true,
      });
    } catch (error) {
      console.error("Failed to mark onboarding as complete:", error);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  const attendanceData = stats
    ? [
        {
          name: "Present",
          value: stats.todaysAttendance.present,
          color: "#10B981",
        },
        {
          name: "Absent",
          value: stats.todaysAttendance.absent,
          color: "#EF4444",
        },
        {
          name: "Pending",
          value: stats.todaysAttendance.pending,
          color: "#F59E0B",
        },
      ]
    : [];

  const salaryData = stats
    ? [
        { name: "Paid", value: stats.monthlySalarySummary.totalPaid },
        { name: "Pending", value: stats.monthlySalarySummary.pending },
      ]
    : [];

  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your staff, attendance, and operations.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.totalStaff || 0}
                </p>
              )}
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-green-600">
                  {stats?.todaysAttendance.present || 0}
                </p>
              )}
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent Today</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-red-600">
                  {stats?.todaysAttendance.absent || 0}
                </p>
              )}
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pending Approval
              </p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-yellow-600">
                  {stats?.todaysAttendance.pending || 0}
                </p>
              )}
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Attendance Pie Chart */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Today's Attendance
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attendanceData.map((entry, index) => (
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

        {/* Salary Summary Bar Chart */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Salary Summary
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activities
          </h3>
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <input
              type="text"
              placeholder="Filter activities..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
        <div className="space-y-4">
          {auditLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded"
                >
                  <Skeleton circle height={32} width={32} />
                  <div className="flex-1">
                    <Skeleton height={16} width="60%" />
                    <Skeleton height={12} width="40%" />
                  </div>
                  <Skeleton height={12} width={80} />
                </div>
              ))
            : auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded"
                >
                  <Activity className="h-8 w-8 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {log.action}
                    </p>
                    <p className="text-xs text-gray-600">by {log.user}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
        </div>
        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {currentPage}</span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded"
          >
            Next
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/staff/add"
            className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <UserPlus className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Add Staff</p>
                <p className="text-sm text-gray-600">Add new staff member</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/admin/attendance/approve"
            className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <CheckSquare className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Approve Attendance</p>
                <p className="text-sm text-gray-600">
                  Review pending attendance
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-green-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        role={session?.user?.role || "ADMIN"}
      />
    </div>
  );
}
