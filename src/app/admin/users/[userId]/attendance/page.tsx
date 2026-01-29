"use client";

import { useSession } from "next-auth/react";
import type { User as UserType } from "next-auth";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { formatDateTime, formatHoursToHM } from "@/lib/utils";
import AttendancePDFGenerator from "@/components/AttendancePDFGenerator";
import { useUserAttendance } from "@/hooks/useUserAttendance";

export interface AttendanceRecord {
  id: string;
  attendanceDate: string;
  punchIn: string | null;
  punchOut: string | null;
  status: string;
  workingHours: number;
  isLate: boolean;
  isLateMinutes?: number;
  overtimeHours: number;
  shiftDurationHours?: number;
}

interface AttendanceData {
  user: UserType | null;
  records: AttendanceRecord[];
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalHours: number;
  };
}

export default function UserAttendancePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const {
    data: attendanceData,
    isLoading: loading,
    error,
  } = useUserAttendance(userId, selectedMonth, selectedYear);

  const handleDownloadReport = () => {
    // Create CSV content
    if (!attendanceData) return;

    const headers = [
      "Date",
      "Punch In",
      "Punch Out",
      "Status",
      "Working Hours",
    ];
    const csvContent = [
      headers.join(","),
      ...attendanceData.records.map((record) =>
        [
          new Date(record.attendanceDate).toLocaleDateString(),
          record.punchIn ? new Date(record.punchIn).toLocaleTimeString() : "-",
          record.punchOut
            ? new Date(record.punchOut).toLocaleTimeString()
            : "-",
          record.status,
          record.workingHours ? formatHoursToHM(record.workingHours) : "-",
        ].join(","),
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${attendanceData?.user?.firstName}_${attendanceData?.user?.lastName}_attendance_${selectedMonth}_${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses =
      "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "APPROVED":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "PENDING":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "REJECTED":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

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

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  return (
    <div className="space-y-6 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 ">
          <Link
            href={`/admin/users/${userId}`}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Attendance Records
            </h1>
            <div className="sm:mt-2  text-sm text-gray-600 ">
              {" "}
              <p>
                {attendanceData?.user?.firstName}{" "}
                {attendanceData?.user?.lastName}
              </p>
              <span>{attendanceData?.user?.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 items-center space-x-3">
          {attendanceData && (
            <AttendancePDFGenerator
              data={attendanceData}
              month={selectedMonth}
              year={selectedYear}
              companyName="PayRollBook"
              className="px-2 py-2 text-xs  sm:px-4   sm:text-sm sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Download PDF</span>
            </AttendancePDFGenerator>
          )}
          <button
            onClick={handleDownloadReport}
            className="px-2 py-2 text-xs  sm:text-sm sm:px-4  sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month & Year
            </label>
            <div className="flex space-x-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {months &&
                  months.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {years &&
                  years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Days</p>
              <p className="text-2xl font-bold text-blue-600">
                {(attendanceData?.summary &&
                  attendanceData?.summary.totalDays) ||
                  0}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Days</p>
              <p className="text-2xl font-bold text-green-600">
                {(attendanceData?.summary &&
                  attendanceData?.summary.presentDays) ||
                  0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent Days</p>
              <p className="text-2xl font-bold text-red-600">
                {(attendanceData?.summary &&
                  attendanceData?.summary.absentDays) ||
                  0}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-purple-600">
                {(attendanceData?.summary &&
                  attendanceData?.summary.totalHours?.toFixed(1)) ||
                  0}
                h
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Attendance Records
          </h3>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Punch In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Punch Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Working Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                    </tr>
                  ))
                ) : attendanceData?.records &&
                  attendanceData?.records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No attendance records found for this month
                    </td>
                  </tr>
                ) : (
                  attendanceData?.records &&
                  attendanceData?.records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(record.attendanceDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.attendanceDate).toLocaleDateString(
                          "en-US",
                          { weekday: "short" },
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.punchIn
                          ? new Date(record.punchIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.punchOut
                          ? new Date(record.punchOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.workingHours
                          ? formatHoursToHM(record.workingHours)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(record.status)}
                          <span className={getStatusBadge(record.status)}>
                            {record.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              ))
            ) : attendanceData?.records &&
              attendanceData?.records.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No attendance records found for this month
              </div>
            ) : (
              attendanceData?.records &&
              attendanceData?.records.map((record) => (
                <div
                  key={record.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(record.attendanceDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(record.attendanceDate).toLocaleDateString(
                          "en-US",
                          { weekday: "long" },
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(record.status)}
                      <span className={getStatusBadge(record.status)}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Punch In</div>
                      <div className="font-medium">
                        {record.punchIn
                          ? new Date(record.punchIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Punch Out</div>
                      <div className="font-medium">
                        {record.punchOut
                          ? new Date(record.punchOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Hours</div>
                      <div className="font-medium">
                        {record.workingHours
                          ? formatHoursToHM(record.workingHours)
                          : "-"}
                      </div>
                    </div>
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
