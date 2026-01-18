"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { debounce } from "@/lib/utils";
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
  UserCheck,
  UserX,
  Filter,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  role: "MANAGER" | "ACCOUNTANT" | "STAFF" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: string;
}

interface UsersStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  deactivatedUsers: number;
  roleDistribution: {
    ADMIN: number;
    MANAGER: number;
    ACCOUNTANT: number;
    STAFF: number;
  };
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UsersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Debounced search function
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
      setCurrentPage(1); // Reset to first page when searching
    }, 500), // 500ms delay
    [],
  );

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [currentPage, roleFilter, statusFilter, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        role: roleFilter,
        status: statusFilter,
        search: searchTerm,
      });

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setError(data.error || "Failed to fetch users");
        setUsers([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setError("Failed to fetch users");
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/users/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleStatusChange = async (
    userId: string,
    newStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED",
  ) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchUsers();
        await fetchStats();
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  const roleData = stats
    ? [
        {
          name: "Admin",
          value: stats.roleDistribution.ADMIN,
          color: "#8B5CF6",
        },
        {
          name: "Manager",
          value: stats.roleDistribution.MANAGER,
          color: "#10B981",
        },
        {
          name: "Accountant",
          value: stats.roleDistribution.ACCOUNTANT,
          color: "#3B82F6",
        },
        {
          name: "Staff",
          value: stats.roleDistribution.STAFF,
          color: "#F59E0B",
        },
      ]
    : [];

  const statusData = stats
    ? [
        { name: "Active", value: stats.activeUsers, color: "#10B981" },
        { name: "Suspended", value: stats.suspendedUsers, color: "#EF4444" },
        {
          name: "Deactivated",
          value: stats.deactivatedUsers,
          color: "#6B7280",
        },
      ]
    : [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Users Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage company users and their access
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.totalUsers || 0}
                </p>
              )}
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-green-600">
                  {stats?.activeUsers || 0}
                </p>
              )}
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Suspended Users
              </p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-red-600">
                  {stats?.suspendedUsers || 0}
                </p>
              )}
            </div>
            <UserX className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Deactivated Users
              </p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-gray-600">
                  {stats?.deactivatedUsers || 0}
                </p>
              )}
            </div>
            <XCircle className="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Role Distribution Pie Chart */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Users by Role
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {roleData.map((entry, index) => (
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

        {/* Status Distribution Bar Chart */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Users by Status
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
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

      {/* Filters and Search */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Users List</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                defaultValue={searchTerm}
                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-64"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="STAFF">Staff</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>
        </div>

        {/* Error Display */}
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

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading
                ? Array.from({ length: itemsPerPage }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Skeleton circle height={32} width={32} />
                          <div className="ml-4">
                            <Skeleton height={16} width={120} />
                            <Skeleton height={12} width={80} />
                          </div>
                        </div>
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
                        <Skeleton height={16} width={100} />
                      </td>
                    </tr>
                  ))
                : users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.firstName?.charAt(0) ||
                                user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800"
                              : user.role === "MANAGER"
                                ? "bg-green-100 text-green-800"
                                : user.role === "ACCOUNTANT"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : user.status === "SUSPENDED"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View user profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() =>
                              handleStatusChange(
                                user.id,
                                user.status === "ACTIVE"
                                  ? "SUSPENDED"
                                  : "ACTIVE",
                              )
                            }
                            disabled={actionLoading === user.id}
                            className={`${
                              user.status === "ACTIVE"
                                ? "text-red-600 hover:text-red-900"
                                : "text-green-600 hover:text-green-900"
                            } disabled:opacity-50`}
                            title={
                              user.status === "ACTIVE"
                                ? "Suspend user"
                                : "Activate user"
                            }
                          >
                            {user.status === "ACTIVE" ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
