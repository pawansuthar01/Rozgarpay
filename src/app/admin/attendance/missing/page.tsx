"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState, useEffect } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  CheckCircle,
  Clock,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useMissingAttendance, useMarkAttendance } from "@/hooks";

interface MissingStaff {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
}

export default function MissingAttendancePage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const [loadingStaffId, setLoadingStaffId] = useState<string | null>(null);

  // Use the custom hooks
  const {
    data: missingData,
    isLoading: loading,
    error: fetchError,
  } = useMissingAttendance({
    date: selectedDate,
    page: currentPage,
    limit: pageLimit,
  });

  const markAttendanceMutation = useMarkAttendance();

  useEffect(() => {
    if (!markAttendanceMutation.isPending) {
      setLoadingStaffId(null);
    }
  }, [markAttendanceMutation.isPending]);

  const handleMarkAttendance = (
    userId: string,
    status: "APPROVED" | "ABSENT" | "LEAVE" = "APPROVED",
  ) => {
    setLoadingStaffId(userId);
    markAttendanceMutation.mutate({
      userId,
      date: selectedDate,
      status,
      reason: "Manual attendance entry by admin",
    });
  };

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-600 p-2 rounded-lg">
                  <AlertTriangle className="text-white h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Missing Attendance
                  </h1>
                  <p className="mt-1 text-sm md:text-base text-gray-600">
                    Staff who haven't marked attendance for the selected date
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/admin/attendance"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Attendance
              </Link>
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <div className="mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Date
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <User className="text-red-600 h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Missing Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : missingData?.totalMissing || 0}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(selectedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {fetchError && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    Failed to load missing attendance data. Please try again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Staff Missing Attendance
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4">
                  <Skeleton height={20} width="60%" />
                  <Skeleton height={16} width="40%" className="mt-2" />
                </div>
              ))
            ) : (missingData?.missingStaff?.length || 0) === 0 ? (
              <div className="px-6 py-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  All staff have marked attendance
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  No missing attendance records for{" "}
                  {new Date(selectedDate).toLocaleDateString()}
                </p>
              </div>
            ) : (
              missingData?.missingStaff?.map((staff) => (
                <div key={staff.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {staff.firstName} {staff.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{staff.email}</p>
                        <p className="text-sm text-gray-500">{staff.phone}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          handleMarkAttendance(staff.id, "APPROVED")
                        }
                        disabled={loadingStaffId === staff.id}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1 text-sm"
                      >
                        {loadingStaffId === staff.id ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span>Present</span>
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(staff.id, "ABSENT")}
                        disabled={loadingStaffId === staff.id}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1 text-sm"
                      >
                        {loadingStaffId === staff.id ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span>Absent</span>
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(staff.id, "LEAVE")}
                        disabled={loadingStaffId === staff.id}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1 text-sm"
                      >
                        {loadingStaffId === staff.id ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span>Leave</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {missingData?.pagination && missingData.pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <span className="font-medium">
                {missingData.missingStaff.length}
              </span>{" "}
              records on page <span className="font-medium">{currentPage}</span>{" "}
              of{" "}
              <span className="font-medium">
                {missingData.pagination.totalPages}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <div className="flex items-center space-x-1">
                {Array.from(
                  { length: Math.min(5, missingData.pagination.totalPages) },
                  (_, i) => {
                    const pageNum =
                      Math.max(
                        1,
                        Math.min(
                          missingData.pagination.totalPages - 4,
                          currentPage - 2,
                        ),
                      ) + i;
                    if (pageNum > missingData.pagination.totalPages)
                      return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pageNum === currentPage
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  },
                )}
              </div>
              <button
                onClick={() =>
                  setCurrentPage(
                    Math.min(
                      missingData.pagination.totalPages,
                      currentPage + 1,
                    ),
                  )
                }
                disabled={currentPage === missingData.pagination.totalPages}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
