"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  CheckCircle,
  XCircle,
  PauseCircle,
  Users,
  Calendar,
  Search,
  Filter,
  BarChart3,
  PieChart,
  ArrowLeft,
} from "lucide-react";
import Pagination from "@/components/Pagination";

interface Company {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    attendances: number;
    salaries: number;
    reports: number;
  };
}

interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  deactivatedCompanies: number;
  totalUsers: number;
  avgUsersPerCompany: number;
  companiesThisMonth: number;
  growthRate: number;
}

export default function CompanyReportsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchCompanies();
    fetchStats();
  }, [search, statusFilter, currentPage]);

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/companies?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError("Failed to fetch companies");
      }
    } catch (error) {
      setError("An error occurred while fetching companies");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/super-admin/stats");
      if (res.ok) {
        const data = await res.json();

        // Calculate additional stats
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // For demo purposes, we'll use the existing data
        // In a real app, you might have more detailed analytics
        const companiesThisMonth = 0; // Would need to query companies created this month
        const growthRate = 0; // Would need historical data

        setStats({
          totalCompanies: data.totalCompanies,
          activeCompanies: data.activeCompanies,
          suspendedCompanies: data.suspendedCompanies,
          deactivatedCompanies:
            data.totalCompanies -
            data.activeCompanies -
            data.suspendedCompanies,
          totalUsers: data.totalUsers,
          avgUsersPerCompany:
            data.totalCompanies > 0
              ? Math.round(data.totalUsers / data.totalCompanies)
              : 0,
          companiesThisMonth,
          growthRate,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "SUSPENDED":
        return "bg-red-100 text-red-800 border-red-200";
      case "DEACTIVATED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4" />;
      case "SUSPENDED":
        return <PauseCircle className="h-4 w-4" />;
      case "DEACTIVATED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusPercentage = (status: string) => {
    if (!stats || stats.totalCompanies === 0) return 0;
    switch (status) {
      case "ACTIVE":
        return Math.round((stats.activeCompanies / stats.totalCompanies) * 100);
      case "SUSPENDED":
        return Math.round(
          (stats.suspendedCompanies / stats.totalCompanies) * 100
        );
      case "DEACTIVATED":
        return Math.round(
          (stats.deactivatedCompanies / stats.totalCompanies) * 100
        );
      default:
        return 0;
    }
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
              🏢 Company Growth Reports
            </h1>
            <p className="mt-2 text-gray-600">
              Analytics and insights on company growth and status distribution
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
                <p className="text-sm font-medium text-gray-600">
                  Total Companies
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalCompanies}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Companies
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.activeCompanies}
                </p>
                <p className="text-xs text-gray-500">
                  {getStatusPercentage("ACTIVE")}% of total
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Suspended Companies
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.suspendedCompanies}
                </p>
                <p className="text-xs text-gray-500">
                  {getStatusPercentage("SUSPENDED")}% of total
                </p>
              </div>
              <PauseCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Users/Company
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.avgUsersPerCompany}
                </p>
                <p className="text-xs text-gray-500">
                  Total users: {stats.totalUsers}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Status Distribution Chart */}
      {stats && stats.totalCompanies > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Company Status Distribution
          </h3>
          <div className="space-y-4">
            {/* Active Companies */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  Active
                </span>
              </div>
              <div className="flex items-center space-x-3 flex-1 ml-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${getStatusPercentage("ACTIVE")}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {getStatusPercentage("ACTIVE")}%
                </span>
              </div>
            </div>

            {/* Suspended Companies */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <PauseCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">
                  Suspended
                </span>
              </div>
              <div className="flex items-center space-x-3 flex-1 ml-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${getStatusPercentage("SUSPENDED")}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {getStatusPercentage("SUSPENDED")}%
                </span>
              </div>
            </div>

            {/* Deactivated Companies */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <XCircle className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Deactivated
                </span>
              </div>
              <div className="flex items-center space-x-3 flex-1 ml-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-600 h-2 rounded-full"
                    style={{ width: `${getStatusPercentage("DEACTIVATED")}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {getStatusPercentage("DEACTIVATED")}%
                </span>
              </div>
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
                placeholder="Search companies..."
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
        </div>
      </div>

      {/* Companies Table */}
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
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchCompanies}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No companies found.</p>
            <Link
              href="/super-admin/create-company"
              className="text-blue-600 hover:text-blue-800"
            >
              Create your first company
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Records
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {company.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {company.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                            company.status
                          )}`}
                        >
                          {getStatusIcon(company.status)}
                          <span className="ml-1">{company.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-400 mr-1" />
                          {company._count.users}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-3 w-3 text-cyan-600" />
                            <span className="text-xs">
                              {company._count.attendances} attendances
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-emerald-600 font-medium">
                              {company._count.salaries} salaries
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-orange-600">
                              {company._count.reports} reports
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                          {new Date(company.createdAt).toLocaleDateString()}
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
