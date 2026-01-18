"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  User,
  Clock,
  CheckCircle,
  XCircle,
  ZoomIn,
  Check,
  X,
} from "lucide-react";

interface AttendanceDetail {
  id: string;
  userName: string;
  userRole: string;
  attendanceDate: string;
  punchIn: string;
  punchOut: string | null;
  status: string;
  imageUrl: string | null;
}

export default function AttendanceDetail() {
  const { data: session } = useSession();
  const params = useParams();
  const attendanceId = params.attendanceId as string;

  const [attendance, setAttendance] = useState<AttendanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (attendanceId) {
      fetchAttendanceDetail();
    }
  }, [attendanceId]);

  const fetchAttendanceDetail = () => {
    setLoading(true);
    fetch(`/api/manager/attendance/${attendanceId}`)
      .then((res) => res.json())
      .then((data) => {
        setAttendance(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (response.ok) {
        fetchAttendanceDetail(); // Refresh the data
      }
    } catch (error) {
      console.error("Failed to approve attendance:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });

      if (response.ok) {
        fetchAttendanceDetail(); // Refresh the data
      }
    } catch (error) {
      console.error("Failed to reject attendance:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (!session || session.user.role !== "MANAGER") {
    return <div>Access Denied</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Attendance Details
          </h1>
          <p className="mt-2 text-gray-600">
            Review attendance record details and take action.
          </p>
        </div>
      </div>

      {/* Attendance Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton circle height={64} width={64} />
              <div className="flex-1">
                <Skeleton height={24} width={200} />
                <Skeleton height={16} width={100} className="mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton height={80} />
              <Skeleton height={80} />
            </div>
            <Skeleton height={200} />
            <div className="flex space-x-4">
              <Skeleton height={48} width={120} />
              <Skeleton height={48} width={120} />
            </div>
          </div>
        ) : attendance ? (
          <div className="space-y-6">
            {/* Staff Info */}
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {attendance.userName}
                </h2>
                <p className="text-gray-600">{attendance.userRole}</p>
              </div>
              <div className="ml-auto">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(attendance.status)}`}
                >
                  {getStatusIcon(attendance.status)}
                  <span className="ml-2">{attendance.status}</span>
                </span>
              </div>
            </div>

            {/* Attendance Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Punch In</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(attendance.punchIn).toLocaleTimeString()}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(attendance.attendanceDate).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">Punch Out</span>
                </div>
                {attendance.punchOut ? (
                  <>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(attendance.punchOut).toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(attendance.attendanceDate).toLocaleDateString()}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">Not punched out yet</p>
                )}
              </div>
            </div>

            {/* Image */}
            {attendance.imageUrl && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Attendance Proof
                </h3>
                <div className="relative">
                  <img
                    src={attendance.imageUrl}
                    alt="Attendance proof"
                    className="w-full max-w-md mx-auto rounded-lg shadow-sm cursor-pointer"
                    onClick={() => setImageZoomed(true)}
                  />
                  <button
                    onClick={() => setImageZoomed(true)}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {attendance.status === "PENDING" && (
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Check className="h-5 w-5 mr-2" />
                  {actionLoading ? "Processing..." : "Approve"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <X className="h-5 w-5 mr-2" />
                  {actionLoading ? "Processing..." : "Reject"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Attendance record not found</p>
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {imageZoomed && attendance?.imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl max-h-screen p-4">
            <button
              onClick={() => setImageZoomed(false)}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={attendance.imageUrl}
              alt="Attendance proof"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
