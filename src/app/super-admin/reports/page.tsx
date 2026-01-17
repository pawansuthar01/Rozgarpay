"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Building2,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  BarChart3,
  DollarSign,
  Users,
  Plus,
} from "lucide-react";
import Pagination from "@/components/Pagination";

interface Report {
  id: string;
  type: string;
  title: string;
  filters: any;
  fileUrl: string | null;
  createdAt: string;
  company: {
    id: string;
    name: string;
    status: string;
  };
}

interface Stats {
  totalReports: number;
  attendanceReports: number;
  salaryReports: number;
  userReports: number;
  companyReports: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filter states
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
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
    fetchReports();
    fetchStats();
  }, [search, typeFilter, companyFilter, currentPage]);

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

  const fetchReports = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        type: typeFilter,
        companyId: companyFilter,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError("Failed to fetch reports");
      }
    } catch (error) {
      setError("An error occurred while fetching reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // For now, we'll calculate stats from the reports data
      // In a real app, you might want a separate stats endpoint
      const res = await fetch("/api/super-admin/reports?limit=1000");
      if (res.ok) {
        const data = await res.json();
        const allReports = data.reports;
        setStats({
          totalReports: allReports.length,
          attendanceReports: allReports.filter(
            (r: Report) => r.type === "ATTENDANCE"
          ).length,
          salaryReports: allReports.filter((r: Report) => r.type === "SALARY")
            .length,
          userReports: allReports.filter((r: Report) => r.type === "USER")
            .length,
          companyReports: allReports.filter((r: Report) => r.type === "COMPANY")
            .length,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleDownload = (report: Report) => {
    if (report.fileUrl) {
      window.open(report.fileUrl, "_blank");
    } else {
      alert("Report file not available");
    }
  };

  const handleView = (report: Report) => {
    // For now, just show report details. In a real app, you might have a detailed view
    alert(
      `Report: ${report.title}\nType: ${report.type}\nCompany: ${
        report.company.name
      }\nCreated: ${new Date(report.createdAt).toLocaleDateString()}`
    );
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "ATTENDANCE":
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case "SALARY":
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case "USER":
        return <Users className="h-5 w-5 text-purple-600" />;
      case "COMPANY":
        return <Building2 className="h-5 w-5 text-orange-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case "ATTENDANCE":
        return "bg-blue-100 text-blue-800";
      case "SALARY":
        return "bg-green-100 text-green-800";
      case "USER":
        return "bg-purple-100 text-purple-800";
      case "COMPANY":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            📊 REPORTS (PLATFORM LEVEL)
          </h1>
          <p className="mt-2 text-gray-600">
            Platform-wide reports and analytics across all companies
          </p>
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Reports
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalReports}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Attendance Reports
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.attendanceReports}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Salary Reports
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.salaryReports}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  User Reports
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.userReports}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Company Reports
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats.companyReports}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-orange-600" />
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
                placeholder="Search reports by title or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Types</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="SALARY">Salary</option>
              <option value="USER">User</option>
              <option value="COMPANY">Company</option>
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

      {/* Reports Table */}
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
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchReports}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No reports found.</p>
            <p className="text-sm text-gray-400">
              Reports will appear here when companies generate them.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
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
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getReportTypeIcon(report.type)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {report.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {report.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReportTypeColor(
                            report.type
                          )}`}
                        >
                          {report.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {report.company.name}
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded-full inline-block ${
                                report.company.status === "ACTIVE"
                                  ? "bg-green-100 text-green-800"
                                  : report.company.status === "SUSPENDED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {report.company.status}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleView(report)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {report.fileUrl && (
                            <button
                              onClick={() => handleDownload(report)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Download Report"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
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
