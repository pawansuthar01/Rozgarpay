import Skeleton from "react-loading-skeleton";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { SalaryRecord } from "@/types/salary";
import { CheckCircle, Clock, FileText, XCircle } from "lucide-react";

interface SalaryTableProps {
  records: SalaryRecord[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onApprove?: (salaryId: string) => void;
  onReject?: (salaryId: string, reason: string) => void;
  onMarkAsPaid?: (
    salaryId: string,
    paymentData: { date: string; method: string; reference?: string },
  ) => void;
  showActions?: boolean;
}

export default function SalaryTable({
  records,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onApprove,
  onReject,
  onMarkAsPaid,
  showActions = false,
}: SalaryTableProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "PENDING":
        return { color: "bg-yellow-100 text-yellow-800", icon: Clock };
      case "APPROVED":
        return { color: "bg-blue-100 text-blue-800", icon: CheckCircle };
      case "PAID":
        return { color: "bg-green-100 text-green-800", icon: CheckCircle };
      case "REJECTED":
        return { color: "bg-red-100 text-red-800", icon: XCircle };
      default:
        return { color: "bg-gray-100 text-gray-800", icon: FileText };
    }
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

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
                Month/Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Days
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Approved Days
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
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
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
                      <Skeleton height={16} width={40} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton height={16} width={40} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton height={16} width={70} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton height={16} width={70} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton height={16} width={80} />
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton height={16} width={100} />
                      </td>
                    )}
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
                        {months[record.month - 1]} {record.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.totalDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.approvedDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{record.grossAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{record.netAmount.toLocaleString()}
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
                      {showActions && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {record.status === "PENDING" && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => onApprove?.(record.id)}
                                className="text-green-600 hover:text-green-900 inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 rounded-md"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt(
                                    "Enter rejection reason:",
                                  );
                                  if (reason) onReject?.(record.id, reason);
                                }}
                                className="text-red-600 hover:text-red-900 inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 rounded-md"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </button>
                            </div>
                          )}
                          {record.status === "APPROVED" && (
                            <button
                              onClick={() => {
                                const date = prompt(
                                  "Enter payment date (YYYY-MM-DD):",
                                  new Date().toISOString().split("T")[0],
                                );
                                const method = prompt(
                                  "Enter payment method (Bank/Cash/UPI):",
                                  "Bank",
                                );
                                const reference = prompt(
                                  "Enter transaction reference (optional):",
                                );
                                if (date && method) {
                                  onMarkAsPaid?.(record.id, {
                                    date,
                                    method,
                                    reference: reference || undefined,
                                  });
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 rounded-md"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      )}
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
