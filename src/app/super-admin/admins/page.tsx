"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  CheckCircle,
  XCircle,
  Users,
  Building2,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Plus,
  Download,
} from "lucide-react";
import Pagination from "@/components/Pagination";

interface Admin {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    status: string;
  } | null;
  _count: {
    attendances: number;
    salaries: number;
  };
}

interface Stats {
  totalAdmins: number;
  activeAdmins: number;
  suspendedAdmins: number;
  deactivatedAdmins: number;
  totalCompanies: number;
}

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCompanies();
    fetchAdmins();
    fetchStats();
  }, [search, statusFilter, companyFilter, currentPage]);

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

  const fetchAdmins = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        companyId: companyFilter,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/admins?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError("Failed to fetch admins");
      }
    } catch (error) {
      setError("An error occurred while fetching admins");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/super-admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalAdmins: data.totalAdmins,
          activeAdmins: data.activeAdmins,
          suspendedAdmins: data.suspendedAdmins,
          deactivatedAdmins: data.deactivatedAdmins,
          totalCompanies: data.totalCompanies,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleView = (admin: Admin) => {
    router.push(`/super-admin/admins/${admin.id}`);
  };

  const handleEdit = (admin: Admin) => {
    // For now, just show an alert. You might want to create an edit modal
    alert(`Editing admin: ${admin.email}`);
  };

  const handleDelete = (admin: Admin) => {
    // For now, just show an alert. You might want to create a delete modal
    alert(`Deleting admin: ${admin.email}`);
  };

  const handleBulkStatusChange = async (status: string) => {
    // TODO: Implement bulk status change API endpoint
    alert(`Bulk status change to ${status} not yet implemented`);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    // TODO: Implement bulk delete API endpoint
    alert("Bulk delete not yet implemented");
    setSelectedIds([]);
  };

  const handleExport = () => {
    // Simple CSV export
    const csvContent = [
      [
        "Name",
        "Email",
        "Phone",
        "Company",
        "Status",
        "Attendances",
        "Salaries",
        "Created At",
      ],
      ...admins.map((admin) => [
        `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "N/A",
        admin.email,
        admin.phone,
        admin.company?.name || "N/A",
        admin.status,
        admin._count.attendances,
        admin._count.salaries,
        new Date(admin.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admins.csv";
    a.click();
    window.URL.revokeObjectURL(url);
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

  const getFullName = (admin: Admin) => {
    const first = admin.firstName || "";
    const last = admin.lastName || "";
    return `${first} ${last}`.trim() || "N/A";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            👤 ADMIN (COMPANY OWNER) MANAGEMENT
          </h1>
          <p className="mt-2 text-gray-600">
            Manage and monitor all admin users across companies
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/super-admin/create-admin"
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Admin</span>
          </Link>
          <Link
            href="/super-admin/dashboard"
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Admins
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalAdmins}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Admins
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.activeAdmins}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Suspended Admins
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.suspendedAdmins}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Companies
                </p>
                <p className="text-3xl font-bold text-indigo-600">
                  {stats.totalCompanies}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-indigo-600" />
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
                placeholder="Search admins by name, email, phone, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
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

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedIds.length} admin{selectedIds.length > 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkStatusChange("ACTIVE")}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkStatusChange("SUSPENDED")}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Suspend
              </button>
              <button
                onClick={() => handleBulkStatusChange("DEACTIVATED")}
                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Deactivate
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admins Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8">
            {/* Skeleton Loader */}
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-4"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="flex space-x-2">
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchAdmins}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No admins found.</p>
            <Link
              href="/super-admin/create-admin"
              className="text-blue-600 hover:text-blue-800"
            >
              Create your first admin
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === admins.length}
                        onChange={() => {
                          if (selectedIds.length === admins.length) {
                            setSelectedIds([]);
                          } else {
                            setSelectedIds(admins.map((a) => a.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Records
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(admin.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, admin.id]);
                            } else {
                              setSelectedIds(
                                selectedIds.filter((id) => id !== admin.id)
                              );
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getFullName(admin)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {admin.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {admin.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {admin.company ? (
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {admin.company.name}
                              </div>
                              <div
                                className={`text-xs px-2 py-1 rounded-full inline-block ${getStatusColor(
                                  admin.company.status
                                )}`}
                              >
                                {admin.company.status}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No Company
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                            admin.status
                          )}`}
                        >
                          {admin.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Users className="h-3 w-3 text-cyan-600" />
                            <span className="text-xs">
                              {admin._count.attendances} attendances
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-emerald-600 font-medium">
                              {admin._count.salaries} salaries
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleView(admin)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(admin)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(admin)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
