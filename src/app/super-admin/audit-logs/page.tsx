"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  User,
  Building2,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Search,
  Filter,
  ArrowLeft,
  TrendingUp,
  PieChart,
  BarChart3,
  Activity,
  Clock,
} from "lucide-react";
import Pagination from "@/components/Pagination";

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  meta: any;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

interface AuditStats {
  totalLogs: number;
  createdActions: number;
  updatedActions: number;
  approvedActions: number;
  rejectedActions: number;
  deletedActions: number;
  companyEntities: number;
  userEntities: number;
  attendanceEntities: number;
  todayLogs: number;
  thisWeekLogs: number;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filter states
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
    fetchStats();
  }, [search, actionFilter, entityFilter, userFilter, currentPage]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/super-admin/users?limit=1000");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users.map((u: any) => ({ id: u.id, email: u.email })));
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        action: actionFilter,
        entity: entityFilter,
        userId: userFilter,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.auditLogs);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError("Failed to fetch audit logs");
      }
    } catch (error) {
      setError("An error occurred while fetching audit logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/super-admin/audit-logs?limit=1000");
      if (res.ok) {
        const data = await res.json();
        const allLogs = data.auditLogs;

        const actionCounts = allLogs.reduce((acc: any, log: AuditLog) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {});

        const entityCounts = allLogs.reduce((acc: any, log: AuditLog) => {
          acc[log.entity] = (acc[log.entity] || 0) + 1;
          return acc;
        }, {});

        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayLogs = allLogs.filter(
          (log: AuditLog) => new Date(log.createdAt) >= today,
        ).length;

        const thisWeekLogs = allLogs.filter(
          (log: AuditLog) => new Date(log.createdAt) >= weekAgo,
        ).length;

        setStats({
          totalLogs: allLogs.length,
          createdActions: actionCounts.CREATED || 0,
          updatedActions: actionCounts.UPDATED || 0,
          approvedActions: actionCounts.APPROVED || 0,
          rejectedActions: actionCounts.REJECTED || 0,
          deletedActions: actionCounts.DELETED || 0,
          companyEntities: entityCounts.COMPANY || 0,
          userEntities: entityCounts.USER || 0,
          attendanceEntities: entityCounts.ATTENDANCE || 0,
          todayLogs,
          thisWeekLogs,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "UPDATED":
        return <Edit className="h-4 w-4 text-blue-600" />;
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "DELETED":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATED":
        return "bg-green-100 text-green-800";
      case "UPDATED":
        return "bg-blue-100 text-blue-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "DELETED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "company":
        return <Building2 className="h-4 w-4 text-blue-600" />;
      case "user":
        return <User className="h-4 w-4 text-purple-600" />;
      case "attendance":
        return <Clock className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEntityColor = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "company":
        return "bg-blue-100 text-blue-800";
      case "user":
        return "bg-purple-100 text-purple-800";
      case "attendance":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUserDisplayName = (user: AuditLog["user"]) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email;
  };

  const getActionPercentage = (actionCount: number) => {
    if (!stats || stats.totalLogs === 0) return 0;
    return Math.round((actionCount / stats.totalLogs) * 100);
  };

  const getEntityPercentage = (entityCount: number) => {
    if (!stats || stats.totalLogs === 0) return 0;
    return Math.round((entityCount / stats.totalLogs) * 100);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/super-admin/dashboard"
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🧾 AUDIT & LOGS
            </h1>
            <p className="mt-2 text-gray-600">
              System audit logs for company updates, admin creation, status
              changes, and security actions
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Audit Logs
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalLogs}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Today's Activity
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.todayLogs}
                </p>
                <p className="text-xs text-gray-500">Logs created today</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.thisWeekLogs}
                </p>
                <p className="text-xs text-gray-500">7-day activity</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Most Active Entity
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats.companyEntities >= stats.userEntities &&
                  stats.companyEntities >= stats.attendanceEntities
                    ? "Companies"
                    : stats.userEntities >= stats.attendanceEntities
                      ? "Users"
                      : "Attendance"}
                </p>
                <p className="text-xs text-gray-500">Highest activity</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {stats && stats.totalLogs > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Action Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-blue-600" />
              Action Distribution
            </h3>
            <div className="space-y-4">
              {stats.createdActions > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Created
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${getActionPercentage(
                            stats.createdActions,
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getActionPercentage(stats.createdActions)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.updatedActions > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Edit className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Updated
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${getActionPercentage(
                            stats.updatedActions,
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getActionPercentage(stats.updatedActions)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.approvedActions > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Approved
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${getActionPercentage(
                            stats.approvedActions,
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getActionPercentage(stats.approvedActions)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.rejectedActions > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Rejected
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${getActionPercentage(
                            stats.rejectedActions,
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getActionPercentage(stats.rejectedActions)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.deletedActions > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Trash2 className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Deleted
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${getActionPercentage(
                            stats.deletedActions,
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getActionPercentage(stats.deletedActions)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Entity Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Entity Distribution
            </h3>
            <div className="space-y-4">
              {stats.companyEntities > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Companies
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${getEntityPercentage(
                            stats.companyEntities,
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getEntityPercentage(stats.companyEntities)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.userEntities > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Users
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${getEntityPercentage(stats.userEntities)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getEntityPercentage(stats.userEntities)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.attendanceEntities > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Attendance
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${getEntityPercentage(
                            stats.attendanceEntities,
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getEntityPercentage(stats.attendanceEntities)}%
                    </span>
                  </div>
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
                placeholder="Search audit logs by entity or entity ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATED">Created</option>
              <option value="UPDATED">Updated</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DELETED">Deleted</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Entities</option>
              <option value="COMPANY">Company</option>
              <option value="USER">User</option>
              <option value="ATTENDANCE">Attendance</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-400" />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
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
              onClick={fetchAuditLogs}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No audit logs found.</p>
            <p className="text-sm text-gray-400">
              Audit logs will appear here when system activities are performed.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(
                            log.action,
                          )}`}
                        >
                          {getActionIcon(log.action)}
                          <span className="ml-1">{log.action}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityColor(
                            log.entity,
                          )}`}
                        >
                          {getEntityIcon(log.entity)}
                          <span className="ml-1 capitalize">
                            {log.entity.toLowerCase()}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getUserDisplayName(log.user)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.user.role.replace("_", " ")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="max-w-xs">
                          <div className="truncate">
                            Entity ID: {log.entityId}
                          </div>
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {Object.entries(log.meta)
                                .slice(0, 2)
                                .map(([key, value]) => (
                                  <span key={key} className="mr-2">
                                    {key}: {String(value)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
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
