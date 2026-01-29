"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCorrectionRequests } from "@/hooks/useCorrectionRequests";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { useModal } from "@/components/ModalProvider";

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

export default function CorrectionRequestsPage() {
  const { data: session } = useSession();
  const { showMessage } = useModal();
  const { requests, loading, error, submitRequest } = useCorrectionRequests();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    attendanceDate: "",
    endDate: "",
    type: "MISSED_PUNCH_IN" as RequestType,
    requestedTime: "",
    requestedAmount: "",
    reason: "",
    evidence: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const result = await submitRequest(formData);

    if (result.success) {
      setShowForm(false);
      setFormData({
        attendanceDate: "",
        type: "LEAVE_REQUEST",
        requestedTime: "",
        requestedAmount: "",
        reason: "",
        evidence: "",
        endDate: "",
      });
    } else {
      showMessage(
        "error",
        "Error",
        result.error || "Something wont wrong, please try again...",
      );
    }

    setSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const renderSkeletonItem = (index: number) => (
    <div key={index} className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
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
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            Correction Requests
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your attendance and other requests
          </p>
        </div>

        <div className="p-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg mb-6 font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md"
          >
            {showForm ? "Cancel Request" : "+ New Request"}
          </button>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="space-y-6 mb-8 bg-gray-50 p-6 rounded-lg border"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Submit New Request
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Request Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as RequestType,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  >
                    {Object.entries(requestTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {(formData.type === "MISSED_PUNCH_IN" ||
                  formData.type === "MISSED_PUNCH_OUT" ||
                  formData.type === "ATTENDANCE_MISS" ||
                  formData.type === "LEAVE_REQUEST") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.attendanceDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          attendanceDate: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}
              </div>

              {formData.type === "MISSED_PUNCH_OUT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requested Time
                  </label>
                  <input
                    type="time"
                    value={formData.requestedTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requestedTime: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              {formData.type === "LEAVE_REQUEST" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows={4}
                  placeholder="Please provide detailed reason for your request..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Requests
            </h3>

            {loading ? (
              <SkeletonList count={3} renderItem={renderSkeletonItem} />
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No requests yet
                </h3>
                <p className="text-gray-600">
                  Create your first correction request to get started.
                </p>
              </div>
            ) : (
              requests.map((req: any) => (
                <div
                  key={req.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {requestTypeLabels[req.type as RequestType]}
                        </h4>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {(req.type === "MISSED_PUNCH_IN" ||
                        req.type === "MISSED_PUNCH_OUT" ||
                        req.type === "ATTENDANCE_MISS" ||
                        req.type === "LEAVE_REQUEST") && (
                        <p className="text-sm text-gray-600 mb-1">
                          📅 {new Date(req.attendanceDate).toLocaleDateString()}
                        </p>
                      )}

                      {req.requestedTime && (
                        <p className="text-sm text-gray-600 mb-1">
                          ⏰{" "}
                          {req.type === "MISSED_PUNCH_OUT"
                            ? `Requested: ${req.requestedTime}`
                            : `End Date: ${new Date(req.requestedTime).toLocaleDateString()}`}
                        </p>
                      )}

                      <p className="text-sm text-gray-700 mb-2">
                        💬 {req.reason}
                      </p>

                      {req.reviewReason && (
                        <div className="bg-gray-50 p-3 rounded-lg mt-3">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Admin Response:
                          </p>
                          <p className="text-sm text-gray-700">
                            {req.reviewReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    Submitted on {new Date(req.createdAt).toLocaleDateString()}{" "}
                    at {new Date(req.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
