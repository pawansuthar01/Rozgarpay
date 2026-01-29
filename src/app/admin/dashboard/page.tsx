"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  Wallet,
  FileText,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  ChevronRight,
  Activity,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";

export default function AdminDashboard() {
  const { data: dashboardData, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Skeleton Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-xl border border-gray-200 animate-pulse"
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  <div className="w-full space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto"></div>
                    <div className="h-5 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Skeleton Quick Actions */}
          <div className="mb-8">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-xl border border-gray-200 animate-pulse"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skeleton Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
            <div className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-48"></div>
                      </div>
                    </div>
                    <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-12 h-12 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We're having trouble loading your dashboard data. This might be a
              temporary issue with our servers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Go Back
              </button>
            </div>
            <div className="mt-8 text-sm text-gray-500">
              <p>If the problem persists, please contact support.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const dashboardCards = [
    {
      title: "Total Staff",
      value: dashboardData?.totalStaff || 0,
      icon: Users,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      href: "/admin/staff",
    },
    {
      title: "Present Today",
      value: dashboardData?.todaysAttendance.present || 0,
      icon: UserCheck,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      href: "/admin/attendance",
    },
    {
      title: "Absent Today",
      value: dashboardData?.todaysAttendance.absent || 0,
      icon: UserX,
      color: "bg-red-500",
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      href: "/admin/attendance",
    },
    {
      title: "Pending Approval",
      value: dashboardData?.todaysAttendance.pending || 0,
      icon: Clock,
      color: "bg-yellow-500",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      href: "/admin/attendance",
    },
    {
      title: "Monthly Salary",
      value: `₹${(dashboardData?.monthlySalarySummary.totalPaid || 0).toLocaleString()}`,
      icon: IndianRupee,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      href: "/admin/salary",
    },
    {
      title: "Cash Balance",
      value: `₹${(dashboardData?.cashbookBalance || 0).toLocaleString()}`,
      icon: Wallet,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      href: "/admin/cashbook",
    },
  ];

  const quickActions = [
    {
      title: "Add Staff",
      description: "Invite new team member",
      icon: Users,
      href: "/admin/users/add",
      color: "bg-blue-500",
    },
    {
      title: "Mark Attendance",
      description: "Record daily attendance",
      icon: CheckCircle2,
      href: "/admin/attendance/missing",
      color: "bg-green-500",
    },
    {
      title: "Generate Salary",
      description: "Process monthly payroll",
      icon: DollarSign,
      href: "/admin/salary/generate",
      color: "bg-purple-500",
    },
    {
      title: "View Reports",
      description: "Analytics & insights",
      icon: BarChart3,
      href: "/admin/reports",
      color: "bg-orange-500",
    },
    {
      title: "Manage Cashbook",
      description: "Track transactions",
      icon: Wallet,
      href: "/admin/cashbook",
      color: "bg-emerald-500",
    },
    {
      title: "Settings",
      description: "Configure system",
      icon: Settings,
      href: "/admin/settings",
      color: "bg-gray-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Grid - Mobile-first responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Link key={index} href={card.href} className="block">
                <div
                  className={`${card.bgColor} p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 group`}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`${card.color} p-2 rounded-lg group-hover:scale-110 transition-transform duration-200`}
                    >
                      <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 sm:text-sm">
                        {card.title}
                      </p>
                      <p
                        className={`text-lg font-bold sm:text-xl ${card.textColor}`}
                      >
                        {card.value}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions - Mobile-first grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:text-xl">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="block bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`${action.color} p-2 rounded-lg group-hover:scale-110 transition-transform duration-200`}
                      >
                        <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm sm:text-base">
                          {action.title}
                        </p>
                        <p className="text-xs text-gray-600 sm:text-sm">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200 sm:h-5 sm:w-5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity - Mobile optimized */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
                Recent Activity
              </h2>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {/* Recent audit logs */}
            {dashboardData?.recentActivities?.slice(0, 10).map((log: any) => (
              <div
                key={log.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {log.action} {log.entity || ""}
                      </p>
                      <p className="text-xs text-gray-600">
                        by {log.user} •{" "}
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                      {log.entity || "Activity"}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {(!dashboardData?.recentActivities ||
              dashboardData.recentActivities.length === 0) && (
              <div className="p-8 text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer spacing for mobile */}
        <div className="h-8 sm:h-12"></div>
      </div>
    </div>
  );
}
