import Skeleton from "react-loading-skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X,
  DollarSign,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { StaffMember } from "@/types/staff";
import { CheckCircle, Clock, XCircle } from "lucide-react";

interface StaffTableProps {
  staff: StaffMember[];
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

export default function StaffTable({
  staff,
  loading,
  actionLoading,
  onAttendanceAction,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
}: StaffTableProps) {
  const getAttendanceStatus = (member: StaffMember) => {
    if (!member.todayAttendance)
      return {
        status: "Not Marked",
        color: "bg-gray-100 text-gray-800",
        icon: Clock,
      };
    switch (member.todayAttendance.status) {
      case "APPROVED":
        return {
          status: "Present",
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
        };
      case "PENDING":
        return {
          status: "Pending",
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
        };
      case "REJECTED":
        return {
          status: "Rejected",
          color: "bg-red-100 text-red-800",
          icon: XCircle,
        };
      default:
        return {
          status: "Unknown",
          color: "bg-gray-100 text-gray-800",
          icon: Clock,
        };
    }
  };

  const getSalaryStatus = (salary: any) => {
    if (!salary)
      return { status: "Not Set", color: "bg-gray-100 text-gray-800" };
    if (salary.status === "PAID")
      return { status: "Paid", color: "bg-green-100 text-green-800" };
    if (salary.status === "PENDING")
      return { status: "Pending", color: "bg-yellow-100 text-yellow-800" };
    return { status: salary.status, color: "bg-blue-100 text-blue-800" };
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
                Today's Attendance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Salary Status
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
                      <div className="flex items-center">
                        <Skeleton circle height={32} width={32} />
                        <div className="ml-4">
                          <Skeleton height={16} width={120} />
                          <Skeleton height={12} width={80} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton height={16} width={80} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton height={16} width={60} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton height={16} width={100} />
                    </td>
                  </tr>
                ))
              : staff.map((member) => {
                  const attendanceInfo = getAttendanceStatus(member);
                  const salaryInfo = getSalaryStatus(member.currentMonthSalary);
                  const AttendanceIcon = attendanceInfo.icon;

                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {member.firstName?.charAt(0) ||
                                member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <AttendanceIcon
                            className={`h-4 w-4 mr-2 ${
                              attendanceInfo.status === "Present"
                                ? "text-green-500"
                                : attendanceInfo.status === "Pending"
                                ? "text-yellow-500"
                                : attendanceInfo.status === "Rejected"
                                ? "text-red-500"
                                : "text-gray-500"
                            }`}
                          />
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${attendanceInfo.color}`}
                          >
                            {attendanceInfo.status}
                          </span>
                        </div>
                        {member.pendingAttendanceCount > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {member.pendingAttendanceCount} pending approvals
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${salaryInfo.color}`}
                        >
                          {salaryInfo.status}
                        </span>
                        {member.currentMonthSalary && (
                          <p className="text-xs text-gray-500 mt-1">
                            ₹
                            {member.currentMonthSalary.netAmount?.toLocaleString() ||
                              0}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/admin/users/${member.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View staff profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {member.todayAttendance?.status === "PENDING" && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() =>
                                  onAttendanceAction(
                                    member.todayAttendance.id,
                                    "APPROVE"
                                  )
                                }
                                disabled={
                                  actionLoading === member.todayAttendance.id
                                }
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                title="Approve attendance"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  onAttendanceAction(
                                    member.todayAttendance.id,
                                    "REJECT"
                                  )
                                }
                                disabled={
                                  actionLoading === member.todayAttendance.id
                                }
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                title="Reject attendance"
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
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
