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

interface AttendanceTableProps {
  records: AttendanceRecord[];
  loading: boolean;
  actionLoading: string | null;
  onAttendanceAction: (
    attendanceId: string,
    action: "APPROVE" | "REJECT"
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
      <div className="overflow-x-auto">
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
                Time In
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Out
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
                        {record.timeIn
                          ? new Date(record.timeIn).toLocaleTimeString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.timeOut
                          ? new Date(record.timeOut).toLocaleTimeString()
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {record.punchImageUrl && (
                            <button
                              onClick={() =>
                                handleViewImage(record.punchImageUrl)
                              }
                              className="text-blue-600 hover:text-blue-900"
                              title="View punch image"
                              aria-label="View punch image"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                          )}
                          {record.status === "PENDING" && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() =>
                                  onAttendanceAction(record.id, "APPROVE")
                                }
                                disabled={actionLoading === record.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                title="Approve attendance"
                                aria-label="Approve attendance"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  onAttendanceAction(record.id, "REJECT")
                                }
                                disabled={actionLoading === record.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                title="Reject attendance"
                                aria-label="Reject attendance"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
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
          Showing page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
