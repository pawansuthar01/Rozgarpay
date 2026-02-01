"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useCorrectionRequests } from "@/hooks/useCorrectionRequests";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  Filter,
  Timer,
  X,
} from "lucide-react";

type RequestType =
  | "MISSED_PUNCH_IN"
  | "MISSED_PUNCH_OUT"
  | "ATTENDANCE_MISS"
  | "LEAVE_REQUEST"
  | "SUPPORT_REQUEST"
  | "SALARY_REQUEST";

const requestTypeLabels: Record<RequestType, string> = {
  MISSED_PUNCH_IN: "Missed Punch In",
  MISSED_PUNCH_OUT: "Missed Punch Out",
  ATTENDANCE_MISS: "Attendance Miss",
  LEAVE_REQUEST: "Leave Request",
  SUPPORT_REQUEST: "Support Request",
  SALARY_REQUEST: "Salary Request",
};

export default function AdminCorrectionRequestsPage() {
  const { data: session } = useSession();
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const { requests, loading, error, handleAction, fetchRequests } =
    useCorrectionRequests({
      isAdmin: true,
      filters,
      pagination: { page: currentPage, limit: 10 },
    });

  const [approving, setApproving] = useState<string | null>(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewReason, setReviewReason] = useState("");

  const handleActionWithReason = async (
    id: string,
    status: "APPROVED" | "REJECTED",
    approvedTime?: string,
  ) => {
    if (status === "REJECTED") {
      setSelectedRequest({ id, status, approvedTime });
      setShowReasonModal(true);
      return;
    }

    setApproving(id);
    const result = await handleAction({ id, status, approvedTime });
    if (result instanceof Error) {
      alert(result.message);
    }
    setApproving(null);
  };

  const submitWithReason = async () => {
    if (!selectedRequest) return;

    setApproving(selectedRequest.id);
    try {
      await handleAction({
        id: selectedRequest.id,
        status: selectedRequest.status,
        approvedTime: selectedRequest.approvedTime,
        reviewReason,
      });
      setShowReasonModal(false);
      setSelectedRequest(null);
      setReviewReason("");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to process request",
      );
    }
    setApproving(null);
  };

  const renderSkeletonItem = (index: number) => (
    <div key={index} className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            Correction Requests Management
          </h1>
          <p className="text-gray-600 mt-1">
            Admin panel for managing all staff requests
          </p>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span className="flex items-center gap-1">
                <Filter className="w-4 h-4" /> Filters
              </span>
              <span className="flex items-center gap-1">
                {!showFilters ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
              </span>
            </button>

            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) =>
                      setFilters({ ...filters, type: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    {Object.entries(requestTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters({ ...filters, startDate: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters({ ...filters, endDate: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      fetchRequests();
                    }}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <SkeletonList count={4} renderItem={renderSkeletonItem} />
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filters.status === "PENDING"
                  ? "All requests processed!"
                  : "No requests found"}
              </h3>
              <p className="text-gray-600">
                {filters.status === "PENDING"
                  ? "No pending correction requests to review."
                  : "Try adjusting your filters to see more results."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {requests.length} of {total} request
                  {total !== 1 ? "s" : ""}
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      filters.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : filters.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : filters.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {filters.status || "All"}: {total}
                  </span>
                </div>
              </div>

              {requests.map((req: any) => (
                <div
                  key={req.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {req.user?.firstName} {req.user?.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {req.user?.email}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {requestTypeLabels[req.type as RequestType]}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          Company Admin
                        </span>
                      </div>

                      {(req.type === "MISSED_PUNCH_IN" ||
                        req.type === "MISSED_PUNCH_OUT" ||
                        req.type === "ATTENDANCE_MISS" ||
                        req.type === "LEAVE_REQUEST") && (
                        <p className="text-sm flex gap-2 items-center text-gray-600 mb-2">
                          <Calendar className="w-4 h-4" /> Date:{" "}
                          {new Date(req.attendanceDate).toLocaleDateString()}
                        </p>
                      )}

                      {req.requestedTime && (
                        <p className="text-sm flex items-center gap-2 text-gray-600 mb-2">
                          <Timer className="w-4 h-4" />{" "}
                          {req.type === "MISSED_PUNCH_OUT"
                            ? `Requested Time: ${req.requestedTime}`
                            : `End Date: ${new Date(req.requestedTime).toLocaleDateString()}`}
                        </p>
                      )}

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          Request Details:
                        </p>
                        <p className="text-sm text-gray-700">{req.reason}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleActionWithReason(req.id, "APPROVED")}
                      disabled={approving === req.id}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approving === req.id ? (
                        "Processing..."
                      ) : (
                        <span className="flex gap-2 items-center">
                          {" "}
                          <Check className="w-4 h-4 " /> Approve{" "}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleActionWithReason(req.id, "REJECTED")}
                      disabled={approving === req.id}
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approving === req.id ? (
                        "Processing..."
                      ) : (
                        <span className="flex gap-2 items-center">
                          {" "}
                          <X className="w-4 h-4 " /> Reject{" "}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Provide Rejection Reason
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Please explain why this request is being rejected.
              </p>
            </div>

            <div className="p-6">
              <textarea
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                rows={4}
                placeholder="Enter detailed reason for rejection..."
                required
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setSelectedRequest(null);
                  setReviewReason("");
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitWithReason}
                disabled={
                  !reviewReason.trim() || approving === selectedRequest?.id
                }
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approving === selectedRequest?.id
                  ? "Submitting..."
                  : "Submit Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
