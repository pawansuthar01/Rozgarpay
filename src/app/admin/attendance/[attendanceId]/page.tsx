"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useParams } from "next/navigation";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle,
  Clock,
  XCircle,
  User,
  Calendar,
  MapPin,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  useAttendanceById,
  useAttendance,
  useUpdateAttendanceStatus,
} from "@/hooks";
import { useModal } from "@/components/ModalProvider";

export default function AdminAttendanceDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const attendanceId = params.attendanceId as string;
  const { showMessage } = useModal();

  // Audit filters
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(10);
  const [auditSortBy, setAuditSortBy] = useState("attendanceDate");
  const [auditSortOrder, setAuditSortOrder] = useState("desc");

  // Use hooks
  const {
    data: attendanceDetail,
    isLoading: loading,
    error: attendanceError,
  } = useAttendanceById(attendanceId);

  const { data: auditData, isLoading: auditLoading } = useAttendance({
    userId: attendanceDetail?.attendance?.userId,
    page: auditPage,
    limit: auditLimit,
    sortBy: auditSortBy,
    sortOrder: auditSortOrder,
  });

  const updateAttendanceMutation = useUpdateAttendanceStatus();

  const handleAttendanceAction = async (action: "APPROVE" | "REJECT") => {
    try {
      await updateAttendanceMutation.mutateAsync({
        attendanceId,
        data: {
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        },
      });
    } catch (error) {
      console.error("Failed to update attendance:", error);
      showMessage("error", "Error", "Failed to update attendance");
    }
  };

  // Extract data from hooks
  const attendance = attendanceDetail?.attendance;
  const attendanceTrends = attendanceDetail?.charts?.attendanceTrends || [];
  const auditRecords = auditData?.records || [];
  const auditTotalPages = auditData?.pagination?.totalPages || 1;
  const error = attendanceError?.message || null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "APPROVED":
        return { color: "bg-green-100 text-green-800", icon: CheckCircle };
      case "PENDING":
        return { color: "bg-yellow-100 text-yellow-800", icon: Clock };
      case "REJECTED":
        return { color: "bg-red-100 text-red-800", icon: XCircle };
      default:
        return { color: "bg-gray-100 text-gray-800", icon: Clock };
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/admin/attendance"
          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          aria-label="Back to attendance list"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            8️⃣ Attendance Detail
          </h1>
          <p className="mt-2 text-gray-600">
            Detailed view of attendance record
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Staff Details */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Staff Details
        </h2>
        {loading ? (
          <div className="space-y-4">
            <Skeleton height={20} width={200} />
            <Skeleton height={16} width={150} />
            <Skeleton height={16} width={180} />
          </div>
        ) : attendance ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {attendance.user.firstName} {attendance.user.lastName}
                </p>
                <p className="text-sm text-gray-500">{attendance.user.phone}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(attendance.attendanceDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">Attendance Date</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Punch Times */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Punch Times
        </h2>
        {loading ? (
          <div className="space-y-4">
            <Skeleton height={20} width={150} />
            <Skeleton height={20} width={150} />
          </div>
        ) : attendance ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {attendance.punchIn
                    ? new Date(attendance.punchIn).toLocaleTimeString()
                    : "Not punched in"}
                </p>
                <p className="text-sm text-gray-500">Punch In</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {attendance.punchOut
                    ? new Date(attendance.punchOut).toLocaleTimeString()
                    : "Not punched out"}
                </p>
                <p className="text-sm text-gray-500">Punch Out</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      {attendance && attendance.status === "PENDING" && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => handleAttendanceAction("APPROVE")}
              disabled={updateAttendanceMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              aria-label="Approve attendance"
            >
              <Check className="h-4 w-4 inline mr-2" />
              Approve
            </button>
            <button
              onClick={() => handleAttendanceAction("REJECT")}
              disabled={updateAttendanceMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              aria-label="Reject attendance"
            >
              <X className="h-4 w-4 inline mr-2" />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Attendance Trends (Last 30 Days)
        </h2>
        {loading ? (
          <Skeleton height={300} />
        ) : (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Attendance Records" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Audit History */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Audit History</h2>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <select
              value={auditLimit}
              onChange={(e) => setAuditLimit(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <select
              value={auditSortBy}
              onChange={(e) => setAuditSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="attendanceDate">Sort by Date</option>
              <option value="status">Sort by Status</option>
            </select>
            <select
              value={auditSortOrder}
              onChange={(e) => setAuditSortOrder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Punch In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Punch Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLoading
                ? Array.from({ length: auditLimit }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={80} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={60} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={80} />
                      </td>
                    </tr>
                  ))
                : auditRecords.map((record) => {
                    const statusInfo = getStatusInfo(record.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.attendanceDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.punchIn
                            ? new Date(record.punchIn).toLocaleTimeString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.punchOut
                            ? new Date(record.punchOut).toLocaleTimeString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <StatusIcon className="h-4 w-4 mr-2" />
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}
                            >
                              {record.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Page {auditPage} of {auditTotalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAuditPage(Math.max(1, auditPage - 1))}
              disabled={auditPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                setAuditPage(Math.min(auditTotalPages, auditPage + 1))
              }
              disabled={auditPage === auditTotalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
