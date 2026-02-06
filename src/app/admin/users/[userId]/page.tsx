"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import {
  ArrowLeft,
  Phone,
  IndianRupee,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  ChevronDown,
  Clock,
  DollarSign,
} from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { bgColorRadom, formatCurrency } from "@/lib/utils";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [page, setPage] = useState(1);
  const [showThisMonth, setShowThisMonth] = useState(true);

  const { userData, loading } = useUserProfile(userId, page);

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleString("default", { month: "short" });
  };

  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const thisMonthName = getMonthName(currentMonthNum);

  const StatsSkeleton = () => (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={12} width={60} />
          <Skeleton height={28} width={100} className="mt-2" />
        </div>
        <Skeleton circle width={40} height={40} />
      </div>
    </div>
  );

  const totalPages = userData?.salaryRecords?.pagination?.totalPages ?? 0;
  const totals = userData?.totals;
  const thisMonthData = userData?.thisMonthData;
  const salaryData = userData?.salaryRecords?.data ?? [];

  // Helper to get color based on balance
  const getBalanceColor = (balance: number) => {
    if (balance > 0)
      return {
        bg: "bg-green-50",
        text: "text-green-600",
        label: "text-green-700",
        border: "border-green-200",
      };
    if (balance < 0)
      return {
        bg: "bg-red-50",
        text: "text-red-600",
        label: "text-red-700",
        border: "border-red-200",
      };
    return {
      bg: "bg-gray-50",
      text: "text-gray-600",
      label: "text-gray-700",
      border: "border-gray-200",
    };
  };

  return (
    <div className="space-y-6 sm:p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/users"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Salary Overview
            </h1>
            <p className="mt-1 sm:mt-2 text-gray-600 text-sm sm:text-base">
              View and manage staff salary
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/admin/users/${userId}/add-payment`)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 self-start sm:self-auto"
        >
          <IndianRupee className="h-4 w-4" />
          <span>Add Payment</span>
        </button>
      </div>

      {/* User Profile Card */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-2 py-1 sm:p-6">
          {loading ? (
            <div className="flex items-center space-x-4">
              <Skeleton circle height={64} width={64} />
              <div className="flex-1">
                <Skeleton height={24} width={200} />
                <Skeleton height={16} width={150} />
              </div>
            </div>
          ) : userData?.user ? (
            <div className="flex gap-2 items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div
                className={`h-16 w-16 ${bgColorRadom()} rounded-full flex items-center justify-center`}
              >
                <span className="text-xl font-medium text-white">
                  {userData.user.firstName?.charAt(0) ||
                    userData.user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {userData.user.firstName} {userData.user.lastName}
                </h2>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {userData.user.phone}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Lifetime Summary - Salary Only */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Lifetime Summary (Salary Only)
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <StatsSkeleton />
              <StatsSkeleton />
              <StatsSkeleton />
              <StatsSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">
                      Total Salary (Net)
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                      {formatCurrency(totals?.totalGiven || 0)}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <IndianRupee className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">
                      Salary Payments
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                      {formatCurrency(totals?.totalPaid || 0)}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">
                      Recoveries
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
                      {formatCurrency(totals?.totalRecovered || 0)}
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <IndianRupee className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>

              {(() => {
                const netPos = totals?.netPosition || 0;
                const balanceColor = getBalanceColor(netPos);
                const isOwed = netPos >= 0;
                return (
                  <div
                    className={`bg-white p-4 rounded-lg shadow-sm border ${balanceColor.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className={`text-xs font-medium ${balanceColor.label}`}
                        >
                          {isOwed ? "Company Owes Staff" : "Staff Owes Company"}
                        </p>
                        <p
                          className={`text-xl sm:text-2xl font-bold ${balanceColor.text} mt-1`}
                        >
                          ₹{formatCurrency(netPos)}
                        </p>
                      </div>
                      <div className={`${balanceColor.bg} p-3 rounded-lg`}>
                        <Wallet className={`h-6 w-6 ${balanceColor.text}`} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* This Month Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <button
          onClick={() => setShowThisMonth(!showThisMonth)}
          className="w-full px-4 py-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">
              This Month (
              {thisMonthData?.period || `${thisMonthName} ${currentYear}`})
            </h3>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${showThisMonth ? "rotate-180" : ""}`}
          />
        </button>

        {showThisMonth && (
          <div className="px-4 pb-6 sm:px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                <>
                  <StatsSkeleton />
                  <StatsSkeleton />
                  <StatsSkeleton />
                  <StatsSkeleton />
                </>
              ) : (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs font-medium text-blue-600">
                      Net Amount
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
                      ₹{formatCurrency(thisMonthData?.netAmount || 0)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-xs font-medium text-green-600">
                      Total Paid
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-green-700 mt-1">
                      ₹{formatCurrency(thisMonthData?.totalPaid || 0)}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-xs font-medium text-red-600">
                      Recoveries
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-red-700 mt-1">
                      ₹{formatCurrency(thisMonthData?.totalRecovered || 0)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-xs font-medium text-yellow-600">
                      Balance
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-700 mt-1">
                      ₹{formatCurrency(thisMonthData?.balanceAmount || 0)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href={`/admin/users/${userId}/attendance`}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer block group"
        >
          <div className="text-center">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                Attendance
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                View daily records
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={`/admin/users/${userId}/reports`}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer block group"
        >
          <div className="text-center">
            <div>
              <h3 className="sm:text-xl text-xs font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                Reports
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                Salary reports
              </p>
            </div>
          </div>
        </Link>

        <button
          onClick={() => router.push(`/admin/users/${userId}/add-payment`)}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex text-center items-center justify-between">
            <div>
              <h3 className=" text-xs sm:text-xl  font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                Pay
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                Company pays staff
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push(`/admin/users/${userId}/recover-payment`)}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                Recover
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                Staff paid company
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Salary History */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Salary History
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton height={16} width={70} />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton height={16} width={70} />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton height={20} width={50} />
                      </td>
                    </tr>
                  ))
                ) : salaryData.length > 0 ? (
                  salaryData.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {getMonthName(record.month)} {record.year}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        ₹{formatCurrency(record.grossAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ₹{formatCurrency(record.netAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.status === "PAID" ? "bg-green-100 text-green-800" : record.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      No salary records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
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
