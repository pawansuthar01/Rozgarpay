"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  User,
  Building2,
  Crown,
  Shield,
  Briefcase,
  Search,
  Filter,
  ArrowLeft,
  TrendingUp,
  PieChart,
  BarChart3,
} from "lucide-react";
import Pagination from "@/components/Pagination";

interface UserData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  company: {
    id: string;
    name: string;
    status: string;
  } | null;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  deactivatedUsers: number;
  superAdmins: number;
  admins: number;
  managers: number;
  accountants: number;
  staff: number;
  usersPerCompany: {
    companyName: string;
    userCount: number;
    companyId: string;
  }[];
}

export default function UsersReportsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filter states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchCompanies();
    fetchUsers();
    fetchStats();
  }, [search, roleFilter, statusFilter, companyFilter, currentPage]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/super-admin/companies?limit=1000");
      if (res.ok) {
        const data = await res.json();
        setCompanies(
          data.companies.map((c: any) => ({ id: c.id, name: c.name }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        role: roleFilter,
        status: statusFilter,
        companyId: companyFilter,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError("Failed to fetch users");
      }
    } catch (error) {
      setError("An error occurred while fetching users");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // For demo purposes, we'll calculate stats from available data
      // In a real app, you might have a separate stats endpoint
      const res = await fetch("/api/super-admin/users?limit=1000");
      if (res.ok) {
        const data = await res.json();
        const allUsers = data.users;

        // Calculate role distribution
        const roleCounts = allUsers.reduce((acc: any, user: UserData) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});

        // Calculate users per company
        const companyUserCounts: {
          [key: string]: { name: string; count: number };
        } = {};
        allUsers.forEach((user: UserData) => {
          if (user.company) {
            if (!companyUserCounts[user.company.id]) {
              companyUserCounts[user.company.id] = {
                name: user.company.name,
                count: 0,
              };
            }
            companyUserCounts[user.company.id].count++;
          }
        });

        const usersPerCompany = Object.entries(companyUserCounts).map(
          ([companyId, data]) => ({
            companyId,
            companyName: data.name,
            userCount: data.count,
          })
        );

        setStats({
          totalUsers: allUsers.length,
          activeUsers: allUsers.filter((u: UserData) => u.status === "ACTIVE")
            .length,
          suspendedUsers: allUsers.filter(
            (u: UserData) => u.status === "SUSPENDED"
          ).length,
          deactivatedUsers: allUsers.filter(
            (u: UserData) => u.status === "DEACTIVATED"
          ).length,
          superAdmins: roleCounts.SUPER_ADMIN || 0,
          admins: roleCounts.ADMIN || 0,
          managers: roleCounts.MANAGER || 0,
          accountants: roleCounts.ACCOUNTANT || 0,
          staff: roleCounts.STAFF || 0,
          usersPerCompany,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Crown className="h-5 w-5 text-purple-600" />;
      case "ADMIN":
        return <Shield className="h-5 w-5 text-blue-600" />;
      case "MANAGER":
        return <Briefcase className="h-5 w-5 text-green-600" />;
      case "ACCOUNTANT":
        return <BarChart3 className="h-5 w-5 text-orange-600" />;
      case "STAFF":
        return <User className="h-5 w-5 text-gray-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-purple-100 text-purple-800";
      case "ADMIN":
        return "bg-blue-100 text-blue-800";
      case "MANAGER":
        return "bg-green-100 text-green-800";
      case "ACCOUNTANT":
        return "bg-orange-100 text-orange-800";
      case "STAFF":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "SUSPENDED":
        return "bg-red-100 text-red-800";
      case "DEACTIVATED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getFullName = (user: UserData) => {
    const first = user.firstName || "";
    const last = user.lastName || "";
    return `${first} ${last}`.trim() || "N/A";
  };

  const getRolePercentage = (roleCount: number) => {
    if (!stats || stats.totalUsers === 0) return 0;
    return Math.round((roleCount / stats.totalUsers) * 100);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/super-admin/reports"
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              👥 User Analytics & Reports
            </h1>
            <p className="mt-2 text-gray-600">
              Comprehensive user distribution and role analytics across
              companies
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/super-admin/dashboard"
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalUsers}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Users
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.activeUsers}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.totalUsers > 0
                    ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Companies with Users
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.usersPerCompany.length}
                </p>
                <p className="text-xs text-gray-500">Active companies</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Users/Company
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats.usersPerCompany.length > 0
                    ? Math.round(
                        stats.totalUsers / stats.usersPerCompany.length
                      )
                    : 0}
                </p>
                <p className="text-xs text-gray-500">Distribution metric</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Role Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-blue-600" />
              Role Distribution
            </h3>
            <div className="space-y-4">
              {stats.superAdmins > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Crown className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Super Admins
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${getRolePercentage(stats.superAdmins)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getRolePercentage(stats.superAdmins)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.admins > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Admins
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${getRolePercentage(stats.admins)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getRolePercentage(stats.admins)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.managers > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Briefcase className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Managers
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${getRolePercentage(stats.managers)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getRolePercentage(stats.managers)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.accountants > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Accountants
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{
                          width: `${getRolePercentage(stats.accountants)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getRolePercentage(stats.accountants)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.staff > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Staff
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-600 h-2 rounded-full"
                        style={{ width: `${getRolePercentage(stats.staff)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getRolePercentage(stats.staff)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Users per Company Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Users per Company
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.usersPerCompany
                .sort((a, b) => b.userCount - a.userCount)
                .slice(0, 10)
                .map((company, index) => (
                  <div
                    key={company.companyId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {company.companyName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-16">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${
                              stats.totalUsers > 0
                                ? Math.max(
                                    (company.userCount / stats.totalUsers) *
                                      100,
                                    5
                                  )
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">
                        {company.userCount}
                      </span>
                    </div>
                  </div>
                ))}
              {stats.usersPerCompany.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="mx-auto h-8 w-8 mb-2" />
                  <p>No company data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8">
            {/* Skeleton Loader */}
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 border border-gray-100 rounded"
                >
                  <div className="h-10 w-10 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No users found.</p>
            <p className="text-sm text-gray-400">
              Users will appear here when they join companies.
            </p>
          </div>
        ) : (
          <>
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
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getFullName(user)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                            user.role
                          )}`}
                        >
                          {getRoleIcon(user.role)}
                          <span className="ml-1">
                            {user.role.replace("_", " ")}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            user.status
                          )}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.company ? (
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.company.name}
                              </div>
                              <div
                                className={`text-xs px-2 py-1 rounded-full inline-block ${
                                  user.company.status === "ACTIVE"
                                    ? "bg-green-100 text-green-800"
                                    : user.company.status === "SUSPENDED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {user.company.status}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No Company
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
