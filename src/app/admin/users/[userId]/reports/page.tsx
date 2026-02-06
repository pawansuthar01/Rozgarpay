"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  ArrowLeft,
  FileText,
  TrendingUp,
  IndianRupee,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Minus,
  RotateCcw,
  Receipt,
  CalendarRange,
} from "lucide-react";
import {
  formatDate,
  formatTime,
  formatCurrency,
  formatLocalDate,
} from "@/lib/utils";
import AttendancePDFGenerator from "@/components/AttendancePDFGenerator";
import SalaryPDFGenerator from "@/components/SalaryPDFGenerator";
import {
  useUserAttendanceReport,
  useUserSalaryReport,
} from "@/hooks/useUserReports";
import { useUser } from "@/hooks";
import { User } from "next-auth";

// Debounce utility for fast loading
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function UserReportsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"attendance" | "salary">(
    "attendance",
  );

  // Get current month in IST
  const getCurrentMonthIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istDate = new Date(now.getTime() + istOffset);
    return {
      year: istDate.getUTCFullYear(),
      month: istDate.getUTCMonth() + 1,
    };
  };

  const { year: currentYear, month: currentMonth } = getCurrentMonthIST();

  // Calculate max allowed date (today)
  const getTodayDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const todayDate = getTodayDate();

  // Generate year options (2020 to current year)
  const yearOptions = Array.from(
    { length: currentYear - 2020 + 1 },
    (_, i) => 2020 + i,
  );

  // Month selector state - controls the month display only
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Calculate first and last day of selected month
  const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const lastDayOfMonth = (() => {
    const today = new Date();

    if (
      selectedYear === today.getFullYear() &&
      selectedMonth === today.getMonth() + 1
    ) {
      return formatLocalDate(today); // "YYYY-MM-DD"
    }

    // Else → last day of selected month
    const lastDate = new Date(selectedYear, selectedMonth, 0);
    return formatLocalDate(lastDate); // "YYYY-MM-DD"
  })();

  const formatDateForInput = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // Date range for attendance - independent of month selection
  const [attendanceStartDate, setAttendanceStartDate] = useState(
    formatDateForInput(firstDayOfMonth),
  );
  const [attendanceEndDate, setAttendanceEndDate] = useState(
    formatDateForInput(new Date(lastDayOfMonth)),
  );

  // Date range for salary - independent of month selection
  const [salaryStartDate, setSalaryStartDate] = useState(
    formatDateForInput(firstDayOfMonth),
  );
  const [salaryEndDate, setSalaryEndDate] = useState(
    formatDateForInput(new Date(lastDayOfMonth)),
  );

  // Debounced date values for API calls to prevent rapid re-fetching
  const debouncedAttendanceStartDate = useDebounce(attendanceStartDate, 300);
  const debouncedAttendanceEndDate = useDebounce(attendanceEndDate, 300);
  const debouncedSalaryStartDate = useDebounce(salaryStartDate, 300);
  const debouncedSalaryEndDate = useDebounce(salaryEndDate, 300);

  // Update dates when month/year changes (one-way sync: month -> dates)
  const updateDatesFromMonth = useCallback((year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayStr = formatDateForInput(firstDay);
    const lastDayStr = formatDateForInput(lastDay);

    setAttendanceStartDate(firstDayStr);
    setAttendanceEndDate(lastDayStr);
    setSalaryStartDate(firstDayStr);
    setSalaryEndDate(lastDayStr);
  }, []);

  const {
    data: attendanceReport,
    isLoading: attendanceLoading,
    error: attendanceError,
  } = useUserAttendanceReport(
    userId,
    debouncedAttendanceStartDate,
    debouncedAttendanceEndDate,
  );

  const { data: data, isLoading: userLoading } = useUser(userId);

  const {
    data: salaryReport,
    isLoading: salaryLoading,
    error: salaryError,
  } = useUserSalaryReport(
    userId,
    debouncedSalaryStartDate,
    debouncedSalaryEndDate,
  );
  // Get attendance records from API
  const attendanceRecords = attendanceReport?.attendanceRecords || [];

  const handleMonthChange = (direction: "prev" | "next") => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (direction === "next") {
      if (
        selectedYear > currentYear ||
        (selectedYear === currentYear && selectedMonth >= currentMonth)
      ) {
        return;
      }

      newMonth += 1;

      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
    }

    if (direction === "prev") {
      newMonth -= 1;

      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
    }

    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    updateDatesFromMonth(newYear, newMonth);
  };

  // Handle year change - prevent selecting future year
  const handleYearChange = (newYear: number) => {
    // Prevent selecting future year
    if (newYear > currentYear) return;

    setSelectedYear(newYear);

    // If current year, ensure month doesn't exceed current month
    if (newYear === currentYear && selectedMonth > currentMonth) {
      setSelectedMonth(currentMonth);
      updateDatesFromMonth(newYear, currentMonth);
    } else {
      updateDatesFromMonth(newYear, selectedMonth);
    }
  };

  // Handle month select - prevent selecting future month if in current year
  const handleMonthSelect = (newMonth: number) => {
    // Prevent selecting future month if in current year
    if (selectedYear === currentYear && newMonth > currentMonth) return;

    setSelectedMonth(newMonth);
    // Update dates for the selected month
    updateDatesFromMonth(selectedYear, newMonth);
  };

  // Handle date range changes - only update dates, don't affect month/year selection
  const handleAttendanceDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
      setAttendanceStartDate(value);
    } else {
      setAttendanceEndDate(value);
    }
  };

  const handleSalaryDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
      setSalaryStartDate(value);
    } else {
      setSalaryEndDate(value);
    }
  };

  // Month options
  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  useEffect(() => {
    if (data?.data) {
      setUser(data.data);
    }
  }, [data, userLoading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href={`/admin/users/${userId}`}
              className="p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                  Reports - {user?.firstName} {user?.lastName}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  View attendance and salary reports
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium transition-colors ${
                activeTab === "attendance"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Attendance</span>
              <span className="sm:hidden">Attendance</span>
            </button>
            <button
              onClick={() => setActiveTab("salary")}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium transition-colors ${
                activeTab === "salary"
                  ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Salary</span>
              <span className="sm:hidden">Salary</span>
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => handleMonthChange("prev")}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthSelect(parseInt(e.target.value))}
                  className="text-lg sm:text-2xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  {monthOptions.map((month) => (
                    <option
                      key={month.value}
                      value={month.value}
                      disabled={
                        selectedYear === currentYear &&
                        month.value > currentMonth
                      }
                    >
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(parseInt(e.target.value))}
                  className="text-lg sm:text-2xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  {yearOptions.map((year) => (
                    <option
                      key={year}
                      value={year}
                      disabled={year > currentYear}
                    >
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Click arrows or use dropdowns above
              </p>
            </div>
            <button
              onClick={() => handleMonthChange("next")}
              className={`p-2 rounded-lg transition-colors ${"hover:bg-gray-100"}`}
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Attendance Report */}
        {activeTab === "attendance" && (
          <div className="space-y-4 sm:space-y-6">
            {attendanceError && (
              <div className="p-3 sm:p-4 text-red-600 bg-red-50 rounded-xl border border-red-200 text-sm">
                Error loading attendance report: {attendanceError.message}
              </div>
            )}

            {/* Date Range Selector for Attendance */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <CalendarRange className="h-5 w-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Date Range Filter
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={attendanceStartDate}
                    onChange={(e) =>
                      handleAttendanceDateChange("start", e.target.value)
                    }
                    min="2025-01-01"
                    max={todayDate}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={attendanceEndDate}
                    onChange={(e) =>
                      handleAttendanceDateChange("end", e.target.value)
                    }
                    min="2025-01-01"
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* PDF Download Button */}
            <div className="flex justify-end">
              {attendanceReport && (
                <AttendancePDFGenerator
                  data={{
                    user: user,
                    records: attendanceRecords,
                    summary: {
                      totalDays: attendanceReport.totalDays,
                      presentDays: attendanceReport.presentDays,
                      absentDays: attendanceReport.absentDays,
                      lateDays: attendanceReport.lateDays,
                      totalHours: attendanceReport.totalWorkingHours,
                    },
                  }}
                  month={selectedMonth}
                  year={selectedYear}
                  companyName="PayRollBook"
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl"
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Download PDF</span>
                </AttendancePDFGenerator>
              )}
            </div>

            {/* Attendance Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Total
                    </p>
                    {attendanceLoading ? (
                      <Skeleton height={24} width={40} />
                    ) : (
                      <p className="text-xl sm:text-3xl font-bold text-blue-600">
                        {attendanceReport?.totalDays}
                      </p>
                    )}
                  </div>
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Present
                    </p>
                    {attendanceLoading ? (
                      <Skeleton height={24} width={40} />
                    ) : (
                      <p className="text-xl sm:text-3xl font-bold text-green-600">
                        {attendanceReport?.presentDays}
                      </p>
                    )}
                  </div>
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Absent
                    </p>
                    {attendanceLoading ? (
                      <Skeleton height={24} width={40} />
                    ) : (
                      <p className="text-xl sm:text-3xl font-bold text-red-600">
                        {attendanceReport?.absentDays}
                      </p>
                    )}
                  </div>
                  <Minus className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Late
                    </p>
                    {attendanceLoading ? (
                      <Skeleton height={24} width={40} />
                    ) : (
                      <p className="text-xl sm:text-3xl font-bold text-yellow-600">
                        {attendanceReport?.lateDays}
                      </p>
                    )}
                  </div>
                  <RotateCcw className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Attendance Records */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-3 sm:p-6 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Daily Attendance
                </h3>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden divide-y divide-gray-200">
                {attendanceLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-4">
                        <Skeleton height={20} width={100} className="mb-2" />
                        <Skeleton height={16} width={80} />
                      </div>
                    ))
                  : attendanceRecords.map((record) => (
                      <div key={record.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              {formatDate(record.attendanceDate)}
                            </h4>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                record.status === "PRESENT" ||
                                record.status === "APPROVED"
                                  ? "bg-green-100 text-green-800"
                                  : record.status === "ABSENT"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {record.status === "APPROVED"
                                ? "PRESENT"
                                : record.status}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {record.workingHours
                              ? `${record.workingHours}h`
                              : "-"}
                          </span>
                        </div>
                      </div>
                    ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Punch In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Punch Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4">
                              <Skeleton height={16} width={80} />
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton height={16} width={60} />
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton height={16} width={60} />
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton height={16} width={60} />
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton height={16} width={40} />
                            </td>
                          </tr>
                        ))
                      : attendanceRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatDate(record.attendanceDate)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  record.status === "PRESENT" ||
                                  record.status === "APPROVED"
                                    ? "bg-green-100 text-green-800"
                                    : record.status === "ABSENT"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {record.status === "APPROVED"
                                  ? "PRESENT"
                                  : record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.punchIn
                                ? formatTime(record.punchIn)
                                : "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.punchOut
                                ? formatTime(record.punchOut)
                                : "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.workingHours
                                ? `${record.workingHours}h`
                                : "-"}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Salary Report */}
        {activeTab === "salary" && (
          <div className="space-y-4 sm:space-y-6">
            {salaryError && (
              <div className="p-3 sm:p-4 text-red-600 bg-red-50 rounded-xl border border-red-200 text-sm">
                Error loading salary report: {salaryError.message}
              </div>
            )}

            {/* Date Range Selector for Salary */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <CalendarRange className="h-5 w-5 text-green-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Date Range Filter
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={salaryStartDate}
                    onChange={(e) =>
                      handleSalaryDateChange("start", e.target.value)
                    }
                    min="2020-01-01"
                    max={todayDate}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={salaryEndDate}
                    onChange={(e) =>
                      handleSalaryDateChange("end", e.target.value)
                    }
                    min="2020-01-01"
                    max={todayDate}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* PDF Actions */}
            <div className="flex flex-wrap gap-3">
              {salaryReport?.pdfUrl && (
                <a
                  href={salaryReport.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 text-sm font-medium"
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>View PDF</span>
                </a>
              )}
              {salaryReport && (
                <SalaryPDFGenerator
                  data={{
                    user: user,
                    ...salaryReport,
                  }}
                  companyName="Rozgarpay"
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg sm:rounded-xl hover:bg-green-700 transition-all duration-200 flex items-center gap-2 text-sm font-medium"
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Download PDF</span>
                </SalaryPDFGenerator>
              )}
            </div>

            {/* Salary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Gross
                    </p>
                    {salaryLoading ? (
                      <Skeleton height={24} width={80} />
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        ₹{formatCurrency(salaryReport?.grossAmount || 0)}
                      </p>
                    )}
                  </div>
                  <IndianRupee className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Paid
                    </p>
                    {salaryLoading ? (
                      <Skeleton height={24} width={80} />
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        ₹{formatCurrency(salaryReport?.totalPaid || 0)}
                      </p>
                    )}
                  </div>
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Recovered
                    </p>
                    {salaryLoading ? (
                      <Skeleton height={24} width={80} />
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold text-red-600">
                        ₹{formatCurrency(salaryReport?.totalRecovered || 0)}
                      </p>
                    )}
                  </div>
                  <RotateCcw className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Balance
                    </p>
                    {salaryLoading ? (
                      <Skeleton height={24} width={80} />
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">
                        ₹{formatCurrency(salaryReport?.balanceAmount || 0)}
                      </p>
                    )}
                  </div>
                  <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Salary Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-3 sm:p-6 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  All Transactions
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {salaryReport?.dateRange
                    ? `${formatDate(salaryReport.dateRange.start)} - ${formatDate(salaryReport.dateRange.end)}`
                    : "Showing all transactions in selected range"}
                </p>
              </div>

              <div className="p-3 sm:p-6">
                {salaryLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} height={48} className="rounded-lg" />
                    ))}
                  </div>
                ) : salaryReport?.allTransactions &&
                  salaryReport.allTransactions.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {salaryReport.allTransactions.map((transaction: any) => (
                      <div
                        key={transaction.id}
                        className="py-3 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              transaction.category === "PAYMENT"
                                ? "bg-green-500"
                                : transaction.category === "DEDUCTION"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                            }`}
                          ></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span
                                className={`px-2 py-0.5 rounded-full ${
                                  transaction.category === "PAYMENT"
                                    ? "bg-green-100 text-green-700"
                                    : transaction.category === "DEDUCTION"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {transaction.category}
                              </span>
                              <span>{formatDate(transaction.date)}</span>
                              {transaction.month && (
                                <span className="text-gray-400">
                                  ({transaction.month}/{transaction.year})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            transaction.category === "PAYMENT"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.category === "PAYMENT" ? "+" : "-"}₹
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p>No transactions found in selected date range</p>
                  </div>
                )}
              </div>
            </div>

            {/* Salary Breakdown Summary */}
            {salaryReport?.breakdowns && salaryReport.breakdowns.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 sm:p-6 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-green-600" />
                    Salary Breakdown Summary
                  </h3>
                </div>

                <div className="p-3 sm:p-6">
                  <div className="divide-y divide-gray-100">
                    {salaryReport.breakdowns.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="py-3 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.amount >= 0 ? "bg-green-500" : "bg-red-500"
                            }`}
                          ></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.type}{" "}
                              {item.category ? `• ${item.category}` : ""}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            item.amount >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {item.amount >= 0 ? "+" : "-"}₹
                          {formatCurrency(Math.abs(item.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
