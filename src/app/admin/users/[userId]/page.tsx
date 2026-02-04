"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  UserCheck,
  UserX,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plus,
} from "lucide-react";
import SalaryActionModal from "@/components/admin/SalaryActionModal";
import CashbookForm from "@/components/admin/cashbook/CashbookForm";
import { CreateCashbookEntryRequest } from "@/types/cashbook";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCreateCashbookEntry } from "@/hooks/useCashbook";
import { bgColorRadom, formatCurrency } from "@/lib/utils";
import { useModal } from "@/components/ModalProvider";

interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  onboardingCompleted: boolean;
}

interface AttendanceSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  statusData: Array<{ name: string; value: number; color: string }>;
  monthlyTrend: any[];
}

interface SalarySummary {
  totalRecords: number;
  totalGross: number;
  totalNet: number;
  monthlyTrend: any[];
}

interface UserData {
  user: UserProfile;
  attendanceSummary: AttendanceSummary;
  salarySummary: SalarySummary;
  attendanceRecords: {
    data: any[];
    pagination: { page: number; totalPages: number; total: number };
  };
  salaryRecords: {
    data: any[];
    pagination: { page: number; totalPages: number; total: number };
  };
}

export default function UserProfilePage() {
  const { data: session } = useSession();
  const { showMessage } = useModal();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [salaryPage, setSalaryPage] = useState(1);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { userData, currentMonthData, loading, error, updateStatus } =
    useUserProfile(userId, salaryPage);

  const handleStatusChange = async (
    newStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED",
  ) => {
    if (
      !confirm(`Are you sure you want to ${newStatus.toLowerCase()} this user?`)
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await updateStatus(newStatus);
    } catch (error) {
      console.error("Failed to update user status:", error);
      showMessage("error", "Error", "Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSalaryAction = (action: string) => {
    switch (action) {
      case "add_payment":
      case "add_earning":
        router.push(`/admin/users/${userId}/add-payment`);
        break;
      case "recover_payment":
      case "recover_earning":
        router.push(`/admin/users/${userId}/recover-payment`);
        break;
      case "add_deduction":
        router.push(`/admin/users/${userId}/add-deduction`);
        break;
      default:
        showMessage("info", "UnKnown", `Unknown action: ${action}`);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

  return (
    <div className="space-y-6 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex gap-2    sm:items-center sm:justify-between ">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/users"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl  sm:text-2xl md:text-3xl font-bold text-gray-900">
              User Profile
            </h1>
            <p className="mt-1 sm:mt-2 text-gray-600 text-sm sm:text-base">
              View and manage user details
            </p>
          </div>
        </div>
        <button
          onClick={() => setSalaryModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 self-start sm:self-auto"
        >
          <IndianRupee className="h-4 w-4" />
          <span>Salary</span>
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
                <Skeleton height={16} width={120} />
              </div>
            </div>
          ) : userData ? (
            <div className="flex gap-2 items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div
                className={`h-16 w-16 ${bgColorRadom()} rounded-full flex items-center justify-center`}
              >
                <span className="text-xl font-medium text-white">
                  {userData?.user?.firstName?.charAt(0) ||
                    userData?.user?.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {userData?.user?.firstName} {userData?.user?.lastName}
                </h2>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {userData.user?.phone}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2  lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs  font-medium text-gray-600">
                Total Attendance
              </p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                userData?.attendanceSummary && (
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {userData?.attendanceSummary?.total || 0}
                  </p>
                )
              )}
            </div>
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs  font-medium text-gray-600">Approved</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                userData?.attendanceSummary && (
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {userData?.attendanceSummary?.approved || 0}
                  </p>
                )
              )}
            </div>
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Pending</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                userData?.attendanceSummary && (
                  <p className="text-xl sm:text-2xl  font-bold text-yellow-600">
                    {userData?.attendanceSummary?.pending || 0}
                  </p>
                )
              )}
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs  font-medium text-gray-600">Amount Paid</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                  {(currentMonthData?.totalPaid || 0) > 0
                    ? formatCurrency(
                        (currentMonthData?.totalPaid || 0) -
                          (currentMonthData?.totalRecovered || 0),
                      )
                    : 0}
                </p>
              )}
            </div>
            <IndianRupee className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
        </div>
      </div>
      {/* Quick Actions */}
      <div className="grid grid-cols-2  lg:grid-cols-5 gap-4 md:gap-6">
        <Link
          href={`/admin/users/${userId}/attendance`}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer block group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                📅 Attendance
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                View daily records
              </p>
            </div>
            <Calendar className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
          </div>
        </Link>

        <Link
          href={`/admin/users/${userId}/reports`}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer block group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                📊 Reports
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                Salary & attendance reports
              </p>
            </div>
            <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
          </div>
        </Link>

        <button
          onClick={() => router.push(`/admin/users/${userId}/add-payment`)}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base flex md:text-lg items-center font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                <IndianRupee size={16} /> Pay Staff
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
                🔄 Staff Paid
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                Staff paid company
              </p>
            </div>
          </div>
        </button>
      </div>
      {/* Salary Overview */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Salary Overview
          </h3>

          {/* This Month Expandable */}
          <div className="mb-6">
            <details className="group">
              <summary className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <span className="text-lg font-medium text-gray-900">
                  This Month
                </span>
                <ChevronRight className="h-5 w-5 text-gray-500 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">
                      Total Salary
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      ₹{formatCurrency(currentMonthData?.netAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-900">
                      Total Paid
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      ₹{formatCurrency(currentMonthData?.totalPaid || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-red-900">
                      Total Recoveries
                    </span>
                    <span className="text-lg font-bold text-red-600">
                      ₹{formatCurrency(currentMonthData?.totalRecovered || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-900">
                      Balance Amount
                    </span>
                    <span className="text-lg font-bold text-purple-600">
                      ₹{formatCurrency(currentMonthData?.balanceAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </details>
          </div>

          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Salary History
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={80} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={80} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={80} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton height={16} width={60} />
                        </td>
                      </tr>
                    ))
                  : userData?.salaryRecords.data &&
                      userData.salaryRecords.data.length > 0
                    ? userData.salaryRecords.data.map((record: any) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.month}/{record.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{formatCurrency(record.grossAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{formatCurrency(record.netAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                record.status === "PAID"
                                  ? "bg-green-100 text-green-800"
                                  : record.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    : !loading && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-4 text-center text-sm text-gray-500"
                          >
                            No salary records exist
                          </td>
                        </tr>
                      )}
              </tbody>
            </table>
          </div>

          {/* Salary Pagination */}
          {userData?.salaryRecords?.pagination?.totalPages !== 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Page {userData?.salaryRecords.pagination.page} of{" "}
                {userData?.salaryRecords.pagination.totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSalaryPage(Math.max(1, salaryPage - 1))}
                  disabled={salaryPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    setSalaryPage(
                      Math.min(
                        userData?.salaryRecords.pagination.totalPages || 0,
                        salaryPage + 1,
                      ),
                    )
                  }
                  disabled={
                    salaryPage === userData?.salaryRecords.pagination.totalPages
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Salary Action Modal */}
      <SalaryActionModal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
        onSelectAction={handleSalaryAction}
      />
    </div>
  );
}
