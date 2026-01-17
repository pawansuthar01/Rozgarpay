"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
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
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  AlertTriangle,
  Trash2,
} from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  phone: string;
  role: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
  status: "pending" | "completed" | "expired";
}

interface InvitationsStats {
  total: number;
  pending: number;
  completed: number;
  expired: number;
  roleDistribution: Record<string, number>;
}

export default function AdminInvitationsPage() {
  const { data: session } = useSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<InvitationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchInvitations();
  }, [currentPage, statusFilter, roleFilter, searchTerm]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        status: statusFilter,
        role: roleFilter,
        search: searchTerm,
      });

      const res = await fetch(`/api/admin/invitations?${params}`);
      const data = await res.json();
      if (res.ok) {
        setInvitations(data.invitations);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      } else {
        console.error("Failed to fetch invitations:", data.error);
        // Optionally set empty data or show error
        setInvitations([]);
        setStats(null);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
      setInvitations([]);
      setStats(null);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this invitation? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleteLoading(invitationId);
    try {
      const res = await fetch(`/api/admin/invitations/${invitationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchInvitations(); // Refresh the list
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete invitation");
      }
    } catch (error) {
      console.error("Failed to delete invitation:", error);
      alert("Failed to delete invitation");
    } finally {
      setDeleteLoading(null);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  const statusData = stats
    ? [
        { name: "Pending", value: stats.pending, color: "#F59E0B" },
        { name: "Completed", value: stats.completed, color: "#10B981" },
        { name: "Expired", value: stats.expired, color: "#EF4444" },
      ]
    : [];

  const roleData = stats
    ? Object.entries(stats.roleDistribution).map(([role, count]) => ({
        name: role,
        value: count,
        color:
          role === "MANAGER"
            ? "#10B981"
            : role === "ACCOUNTANT"
            ? "#3B82F6"
            : "#F59E0B",
      }))
    : [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "expired":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses =
      "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "completed":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "expired":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Invitations Management
          </h1>
          <p className="mt-2 text-gray-600">
            Track and manage user invitations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Invitations
              </p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.total || 0}
                </p>
              )}
            </div>
            <Mail className="h-8 w-8 text-blue-600" />
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
                  {stats?.pending || 0}
                </p>
              )}
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-green-600">
                  {stats?.completed || 0}
                </p>
              )}
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-red-600">
                  {stats?.expired || 0}
                </p>
              )}
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Invitation Status
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
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
            Invitations by Role
          </h3>
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleData}>
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
          <h3 className="text-lg font-semibold text-gray-900">
            Invitations List
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Roles</option>
              <option value="STAFF">Staff</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
        </div>

        {/* Invitations Table */}
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
                  Expires
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
                ? Array.from({ length: 10 }).map((_, i) => (
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
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={80} />
                      </td>
                    </tr>
                  ))
                : invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {invitation.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {invitation.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {invitation.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invitation.role === "MANAGER"
                              ? "bg-green-100 text-green-800"
                              : invitation.role === "ACCOUNTANT"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {invitation.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(invitation.status)}
                          <span
                            className={`ml-2 ${getStatusBadge(
                              invitation.status
                            )}`}
                          >
                            {invitation.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {invitation.status === "pending" && (
                          <button
                            onClick={() =>
                              handleDeleteInvitation(invitation.id)
                            }
                            disabled={deleteLoading === invitation.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete invitation"
                          >
                            {deleteLoading === invitation.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
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
