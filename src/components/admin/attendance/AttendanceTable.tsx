import Skeleton from "react-loading-skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { AttendanceRecord } from "@/types/attendance";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { useState } from "react";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  loading: boolean;
  actionLoading: string | null;
  onAttendanceAction: (
    attendanceId: string,
    action: "APPROVE" | "REJECT",
  ) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

export default function AttendanceTable({
  records,
  loading,
  actionLoading,
  onAttendanceAction,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
}: AttendanceTableProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
        };
      case "PENDING":
        return {
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
        };
      case "REJECTED":
        return {
          color: "bg-red-100 text-red-800",
          icon: XCircle,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          icon: Clock,
        };
    }
  };

  const handleViewImage = (url?: string) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staff Member
              </th>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading
              ? Array.from({ length: itemsPerPage }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton height={16} width={120} />
                    </td>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton height={16} width={100} />
                    </td>
                  </tr>
                ))
              : records.map((record) => {
                  const statusInfo = getStatusInfo(record.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.user.firstName} {record.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.attendanceDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium gap-2 flex items-center flex-wrap">
                          {record.punchIn
                            ? new Date(record.punchIn).toLocaleTimeString()
                            : "-"}
                          {record.punchInImageUrl ? (
                            <button
                              onClick={() =>
                                setSelectedImage(
                                  record?.punchInImageUrl || null,
                                )
                              }
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">
                              No image
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900  ">
                        <div className="font-medium gap-2 flex items-center flex-wrap">
                          {record.punchOut
                            ? new Date(record.punchOut).toLocaleTimeString()
                            : "-"}

                          {record.punchOutImageUrl ? (
                            <button
                              onClick={() =>
                                setSelectedImage(
                                  record?.punchOutImageUrl || null,
                                )
                              }
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">
                              No image
                            </span>
                          )}
                        </div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {record.punchOut ? (
                            record.status.includes("PENDING") ? (
                              <div className="flex space-x-1">
                                <button
                                  onClick={() =>
                                    onAttendanceAction(record.id, "APPROVE")
                                  }
                                  disabled={actionLoading === record.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 border border-green-600 px-2 py-2 cursor-pointer rounded-lg flex items-center "
                                  title="Approve attendance"
                                  aria-label="Approve attendance"
                                >
                                  {" "}
                                  Approve
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    onAttendanceAction(record.id, "REJECT")
                                  }
                                  disabled={actionLoading === record.id}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 border border-red-600 px-2 py-2 cursor-pointer rounded-lg flex items-center "
                                  title="Reject attendance"
                                  aria-label="Reject attendance"
                                >
                                  Reject
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  onAttendanceAction(record.id, "REJECT")
                                }
                                disabled={actionLoading === record.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 border border-red-600 px-2 py-2 cursor-pointer rounded-lg flex items-center "
                                title="Reject attendance"
                                aria-label="Reject attendance"
                              >
                                Reject
                                <X className="h-4 w-4" />
                              </button>
                            )
                          ) : (
                            <p className="text-sm text-red-300">
                              No punch out yet
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading
          ? Array.from({ length: itemsPerPage }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <Skeleton height={20} width={150} className="mb-2" />
                <Skeleton height={16} width={100} className="mb-2" />
                <div className="flex justify-between items-center">
                  <Skeleton height={16} width={80} />
                  <Skeleton height={24} width={60} />
                </div>
              </div>
            ))
          : records.map((record) => {
              const statusInfo = getStatusInfo(record.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={record.id}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {record.user.firstName} {record.user.lastName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {record.user.email}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <StatusIcon className="h-4 w-4 mr-1" />
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(record.attendanceDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Punch In</p>
                      <p className="font-medium gap-2 flex items-center flex-wrap">
                        {record.punchIn
                          ? new Date(record.punchIn).toLocaleTimeString()
                          : "-"}
                        {record.punchInImageUrl ? (
                          <button
                            onClick={() =>
                              setSelectedImage(record?.punchInImageUrl || null)
                            }
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No image
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Punch Out</p>
                      <p className="font-medium gap-2 flex items-center flex-wrap">
                        {record.punchOut
                          ? new Date(record.punchOut).toLocaleTimeString()
                          : "-"}
                        {record.punchOutImageUrl ? (
                          <button
                            onClick={() =>
                              setSelectedImage(record?.punchOutImageUrl || null)
                            }
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No image
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Actions</p>
                    </div>
                  </div>

                  {record.punchOut && record.status.includes("PENDING") ? (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => onAttendanceAction(record.id, "APPROVE")}
                        disabled={actionLoading === record.id}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50 border border-green-600 px-2 py-2 cursor-pointer rounded-lg flex items-center "
                        title="Approve attendance"
                        aria-label="Approve attendance"
                      >
                        {" "}
                        Approve
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onAttendanceAction(record.id, "REJECT")}
                        disabled={actionLoading === record.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 border border-red-600 px-2 py-2 cursor-pointer rounded-lg flex items-center "
                        title="Reject attendance"
                        aria-label="Reject attendance"
                      >
                        Reject
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAttendanceAction(record.id, "REJECT")}
                      disabled={actionLoading === record.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 border border-red-600 px-2 py-2 cursor-pointer rounded-lg flex items-center "
                      title="Reject attendance"
                      aria-label="Reject attendance"
                    >
                      Reject
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {!record.punchOut && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-orange-600 font-medium">
                        No punch out yet
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          <span className="font-medium">{records.length}</span> records on page{" "}
          <span className="font-medium">{currentPage}</span> of{" "}
          <span className="font-medium">{totalPages}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum =
                Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === currentPage
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative max-w-2xl max-h-screen p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="Attendance proof"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
