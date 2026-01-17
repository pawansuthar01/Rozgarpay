"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  UserCheck,
  UserX,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  onboardingCompleted: boolean;
}

interface AttendanceSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  statusData: Array<{ name: string; value: number; color: string }>;
  monthlyTrend: any[];
}

interface SalarySummary {
  totalRecords: number;
  totalGross: number;
  totalNet: number;
  monthlyTrend: any[];
}

interface UserData {
  user: UserProfile;
  attendanceSummary: AttendanceSummary;
  salarySummary: SalarySummary;
  attendanceRecords: {
    data: any[];
    pagination: { page: number; totalPages: number; total: number };
  };
  salaryRecords: {
    data: any[];
    pagination: { page: number; totalPages: number; total: number };
  };
}

export default function UserProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [attendancePage, setAttendancePage] = useState(1);
  const [salaryPage, setSalaryPage] = useState(1);

  useEffect(() => {
    fetchUserData();
  }, [userId, attendancePage, salaryPage]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users/${userId}?attendancePage=${attendancePage}&salaryPage=${salaryPage}&limit=10`
      );
      const data = await response.json();
      setUserData(data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    newStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED"
  ) => {
    if (
      !confirm(`Are you sure you want to ${newStatus.toLowerCase()} this user?`)
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchUserData(); // Refresh data
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update user status");
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
      alert("Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  const getStatusBadge = (status: string) => {
    const baseClasses =
      "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "ACTIVE":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "SUSPENDED":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "DEACTIVATED":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses =
      "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (role) {
      case "ADMIN":
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case "MANAGER":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "ACCOUNTANT":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "STAFF":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/admin/users"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            User Profile
          </h1>
          <p className="mt-2 text-gray-600">View and manage user details</p>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {loading ? (
            <div className="flex items-center space-x-4">
              <Skeleton circle height={64} width={64} />
              <div className="flex-1">
                <Skeleton height={24} width={200} />
                <Skeleton height={16} width={150} />
                <Skeleton height={16} width={120} />
              </div>
            </div>
          ) : userData ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xl font-medium text-gray-700">
                  {userData.user.firstName?.charAt(0) ||
                    userData.user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {userData.user.firstName} {userData.user.lastName}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={getRoleBadge(userData.user.role)}>
                    {userData.user.role}
                  </span>
                  <span className={getStatusBadge(userData.user.status)}>
                    {userData.user.status}
                  </span>
                  {userData.user.onboardingCompleted && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Onboarding Completed
                    </span>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {userData.user.email}
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {userData.user.phone}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Joined{" "}
                    {new Date(userData.user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                {userData.user.status === "ACTIVE" ? (
                  <button
                    onClick={() => handleStatusChange("SUSPENDED")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Updating..." : "Suspend User"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange("ACTIVE")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Updating..." : "Activate User"}
                  </button>
                )}
                {userData.user.status !== "DEACTIVATED" && (
                  <button
                    onClick={() => handleStatusChange("DEACTIVATED")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Updating..." : "Deactivate"}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Attendance
              </p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-blue-600">
                  {userData?.attendanceSummary.total || 0}
                </p>
              )}
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-green-600">
                  {userData?.attendanceSummary.approved || 0}
                </p>
              )}
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-yellow-600">
                  {userData?.attendanceSummary.pending || 0}
                </p>
              )}
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Salary</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-emerald-600">
                  ₹{userData?.salarySummary.totalNet.toLocaleString() || 0}
                </p>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Attendance Status
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userData?.attendanceSummary.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {userData?.attendanceSummary.statusData.map(
                      (entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      )
                    )}
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
            Monthly Attendance Trend
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userData?.attendanceSummary.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Attendance
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Punch In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Punch Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={80} />
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
                      </tr>
                    ))
                  : userData?.attendanceRecords.data.map((record: any) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.attendanceDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.punchIn
                            ? new Date(record.punchIn).toLocaleTimeString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.punchOut
                            ? new Date(record.punchOut).toLocaleTimeString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : record.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Attendance Pagination */}
          {userData?.attendanceRecords?.pagination?.totalPages &&
            userData?.attendanceRecords?.pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Page {userData?.attendanceRecords.pagination.page} of{" "}
                  {userData?.attendanceRecords.pagination.totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setAttendancePage(Math.max(1, attendancePage - 1))
                    }
                    disabled={attendancePage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setAttendancePage(
                        Math.min(
                          userData.attendanceRecords.pagination.totalPages,
                          attendancePage + 1
                        )
                      )
                    }
                    disabled={
                      attendancePage ===
                      userData.attendanceRecords.pagination.totalPages
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Salary Records */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Salary History
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={80} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={80} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={80} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={60} />
                        </td>
                      </tr>
                    ))
                  : userData?.salaryRecords.data.map((record: any) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.month}/{record.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{record.grossAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{record.netAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === "PAID"
                                ? "bg-green-100 text-green-800"
                                : record.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Salary Pagination */}
          {userData?.salaryRecords?.pagination?.totalPages &&
            userData?.salaryRecords?.pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Page {userData?.salaryRecords.pagination.page} of{" "}
                  {userData.salaryRecords.pagination.totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSalaryPage(Math.max(1, salaryPage - 1))}
                    disabled={salaryPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setSalaryPage(
                        Math.min(
                          userData?.salaryRecords.pagination.totalPages || 0,
                          salaryPage + 1
                        )
                      )
                    }
                    disabled={
                      salaryPage ===
                      userData?.salaryRecords.pagination.totalPages
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
