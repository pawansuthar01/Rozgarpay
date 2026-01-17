"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  Building2,
  CheckCircle,
  XCircle,
  Users,
  User,
  BarChart3,
  DollarSign,
  FileText,
  Heart,
  ArrowRight,
  Plus,
} from "lucide-react";

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalAdmins: number;
  totalUsers: number;
  totalAttendance: number;
  totalSalaries: number;
  totalReports: number;
  systemHealth: string;
  recentCompanies: Array<{
    id: string;
    name: string;
    createdAt: string;
    status: string;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    role: string;
    createdAt: string;
    status: string;
  }>;
}

export default function SuperAdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/super-admin/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return <div>Access Denied</div>;
  }

  const companyStatusData = [
    { name: "Active", value: stats?.activeCompanies || 0, color: "#10B981" },
    {
      name: "Suspended",
      value: stats?.suspendedCompanies || 0,
      color: "#EF4444",
    },
  ];

  const metricsData = [
    {
      name: "Companies",
      total: stats?.totalCompanies || 0,
      active: stats?.activeCompanies || 0,
      suspended: stats?.suspendedCompanies || 0,
    },
    {
      name: "Users",
      total: stats?.totalUsers || 0,
      admins: stats?.totalAdmins || 0,
    },
    {
      name: "Records",
      attendance: stats?.totalAttendance || 0,
      salaries: stats?.totalSalaries || 0,
      reports: stats?.totalReports || 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome to the Super Admin Dashboard. Monitor key metrics and manage
            your system.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-green-600">
          <Heart className="h-5 w-5" />
          <span className="font-medium">
            {stats?.systemHealth || "Checking..."}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Companies
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.totalCompanies || 0}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Companies
              </p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.activeCompanies || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Suspended Companies
              </p>
              <p className="text-3xl font-bold text-red-600">
                {stats?.suspendedCompanies || 0}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Admins</p>
              <p className="text-3xl font-bold text-purple-600">
                {stats?.totalAdmins || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-indigo-600">
                {stats?.totalUsers || 0}
              </p>
            </div>
            <User className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Attendance
              </p>
              <p className="text-3xl font-bold text-cyan-600">
                {stats?.totalAttendance || 0}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-cyan-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Salaries
              </p>
              <p className="text-3xl font-bold text-emerald-600">
                {stats?.totalSalaries || 0}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-3xl font-bold text-orange-600">
                {stats?.totalReports || 0}
              </p>
            </div>
            <FileText className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Status Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Company Status Distribution
          </h3>
          <div
            className={`h-80 min-h-80
`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={companyStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {companyStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Recent Companies
              </h4>
              <div className="space-y-2">
                {stats?.recentCompanies?.slice(0, 3).map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">
                        {company.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">No recent companies</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Recent Users
              </h4>
              <div className="space-y-2">
                {stats?.recentUsers?.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm font-medium">{user.email}</span>
                    </div>
                    <span className="text-xs text-gray-500">{user.role}</span>
                  </div>
                )) || <p className="text-sm text-gray-500">No recent users</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/super-admin/companies"
            className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Manage Companies</p>
                <p className="text-sm text-gray-600">
                  View and manage all companies
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/super-admin/create-company"
            className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <Plus className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Create Company</p>
                <p className="text-sm text-gray-600">Add new company</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-green-600 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/super-admin/create-admin"
            className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Create Admin</p>
                <p className="text-sm text-gray-600">Add admin user</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
