"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  ArrowLeft,
  FileText,
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Minus,
  RotateCcw,
} from "lucide-react";

interface AttendanceReport {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendanceRecords: {
    date: string;
    status: string;
    punchIn: string | null;
    punchOut: string | null;
    hoursWorked: number | null;
  }[];
}

interface SalaryReport {
  month: number;
  year: number;
  grossAmount: number;
  netAmount: number;
  totalPaid: number;
  totalRecovered: number;
  balanceAmount: number;
  pdfUrl?: string;
  payments: {
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
  }[];
  deductions: {
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
  }[];
  recoveries: {
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
  }[];
}

export default function StaffReportsPage() {
  const { data: session } = useSession();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [attendanceReport, setAttendanceReport] =
    useState<AttendanceReport | null>(null);
  const [salaryReport, setSalaryReport] = useState<SalaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"attendance" | "salary">(
    "attendance",
  );

  useEffect(() => {
    if (selectedMonth && session?.user?.id) {
      fetchReports();
    }
  }, [selectedMonth, session?.user?.id]);

  const fetchReports = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const [attendanceRes, salaryRes] = await Promise.all([
        fetch(
          `/api/admin/users/${session.user.id}/attendance?month=${selectedMonth}`,
        ),
        fetch(
          `/api/admin/users/${session.user.id}/salary?month=${selectedMonth}`,
        ),
      ]);

      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        setAttendanceReport(attendanceData);
      }

      if (salaryRes.ok) {
        const salaryData = await salaryRes.json();
        setSalaryReport(salaryData);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const [year, month] = selectedMonth.split("-").map(Number);
    let newYear = year;
    let newMonth = month;

    if (direction === "prev") {
      newMonth = month - 1;
      if (newMonth < 1) {
        newMonth = 12;
        newYear = year - 1;
      }
    } else {
      newMonth = month + 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear = year + 1;
      }
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  const getMonthName = (monthYear: string) => {
    const [year, month] = monthYear.split("-").map(Number);
    return new Date(year, month - 1).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  if (!session || session.user.role !== "STAFF") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/staff/dashboard"
              className="p-3 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  My Reports
                </h1>
                <p className="mt-1 text-sm md:text-base text-gray-600">
                  View your attendance and salary reports
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => handleMonthChange("prev")}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                {getMonthName(selectedMonth)}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Select month to view reports
              </p>
            </div>
            <button
              onClick={() => handleMonthChange("next")}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === "attendance"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <TrendingUp className="h-5 w-5 inline mr-2" />
              Attendance Report
            </button>
            <button
              onClick={() => setActiveTab("salary")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === "salary"
                  ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <DollarSign className="h-5 w-5 inline mr-2" />
              Salary Report
            </button>
          </div>
        </div>

        {/* Attendance Report */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* Attendance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Days
                    </p>
                    {loading ? (
                      <Skeleton height={28} width={40} />
                    ) : (
                      <p className="text-2xl md:text-3xl font-bold text-blue-600">
                        {attendanceReport?.totalDays || 0}
                      </p>
                    )}
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Present</p>
                    {loading ? (
                      <Skeleton height={28} width={40} />
                    ) : (
                      <p className="text-2xl md:text-3xl font-bold text-green-600">
                        {attendanceReport?.presentDays || 0}
                      </p>
                    )}
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Absent</p>
                    {loading ? (
                      <Skeleton height={28} width={40} />
                    ) : (
                      <p className="text-2xl md:text-3xl font-bold text-red-600">
                        {attendanceReport?.absentDays || 0}
                      </p>
                    )}
                  </div>
                  <ChevronLeft className="h-8 w-8 text-red-600 rotate-180" />
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Late</p>
                    {loading ? (
                      <Skeleton height={28} width={40} />
                    ) : (
                      <p className="text-2xl md:text-3xl font-bold text-yellow-600">
                        {attendanceReport?.lateDays || 0}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-8 w-8 text-yellow-600 rotate-180" />
                </div>
              </div>
            </div>

            {/* Attendance Records */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Daily Attendance
                </h3>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-200">
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="p-4">
                        <Skeleton height={20} width={100} className="mb-2" />
                        <Skeleton height={16} width={80} />
                      </div>
                    ))
                  : attendanceReport?.attendanceRecords.map((record) => (
                      <div key={record.date} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              {new Date(record.date).toLocaleDateString()}
                            </h4>
                            <p
                              className={`text-xs px-2 py-1 rounded-full inline-block ${
                                record.status === "PRESENT"
                                  ? "bg-green-100 text-green-800"
                                  : record.status === "ABSENT"
                                    ? "bg-red-100 text-red-800"
                                    : record.status === "LATE"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {record.status}
                            </p>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            {record.hoursWorked
                              ? `${record.hoursWorked}h`
                              : "-"}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {record.punchIn && record.punchOut
                            ? `${record.punchIn} - ${record.punchOut}`
                            : "No punches"}
                        </div>
                      </div>
                    ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punch In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punch Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours Worked
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading
                      ? Array.from({ length: 10 }).map((_, i) => (
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
                              <Skeleton height={16} width={60} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Skeleton height={16} width={40} />
                            </td>
                          </tr>
                        ))
                      : attendanceReport?.attendanceRecords.map((record) => (
                          <tr key={record.date} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  record.status === "PRESENT"
                                    ? "bg-green-100 text-green-800"
                                    : record.status === "ABSENT"
                                      ? "bg-red-100 text-red-800"
                                      : record.status === "LATE"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.punchIn || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.punchOut || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.hoursWorked
                                ? `${record.hoursWorked}h`
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
          <div className="space-y-6">
            {/* PDF View Link */}
            {salaryReport?.pdfUrl && (
              <div className="flex justify-end">
                <a
                  href={salaryReport.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 font-medium  hover:shadow-xl"
                >
                  <FileText className="h-5 w-5" />
                  <span>View Salary PDF</span>
                </a>
              </div>
            )}

            {/* Salary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Gross Amount
                    </p>
                    {loading ? (
                      <Skeleton height={28} width={80} />
                    ) : (
                      <p className="text-2xl md:text-3xl font-bold text-blue-600">
                        ₹{salaryReport?.grossAmount?.toLocaleString() || 0}
                      </p>
                    )}
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Net Amount
                    </p>
                    {loading ? (
                      <Skeleton height={28} width={80} />
                    ) : (
                      <p className="text-2xl md:text-3xl font-bold text-green-600">
                        ₹{salaryReport?.netAmount?.toLocaleString() || 0}
                      </p>
                    )}
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Balance</p>
                    {loading ? (
                      <Skeleton height={28} width={80} />
                    ) : (
                      <p className="text-2xl md:text-3xl font-bold text-purple-600">
                        ₹{salaryReport?.balanceAmount?.toLocaleString() || 0}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-8 w-8 text-purple-600 rotate-180" />
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    📊 Recent Transactions
                  </h3>
                  <span className="text-sm text-blue-600 font-medium">
                    Last 30 days
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {salaryReport?.payments?.slice(0, 10).map((payment) => (
                  <div key={payment.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            Salary Payment
                          </h4>
                          <p className="text-xs text-gray-500">
                            {payment.type} •{" "}
                            {new Date(payment.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {payment.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          +₹{payment.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {salaryReport?.deductions?.slice(0, 10).map((deduction) => (
                  <div key={deduction.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Minus className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            {deduction.type}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Deduction •{" "}
                            {new Date(deduction.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {deduction.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          -₹{deduction.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {salaryReport?.recoveries?.slice(0, 10).map((recovery) => (
                  <div key={recovery.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <RotateCcw className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            Recovery
                          </h4>
                          <p className="text-xs text-gray-500">
                            {recovery.type} •{" "}
                            {new Date(recovery.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {recovery.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          -₹{recovery.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {!salaryReport?.payments?.length &&
                  !salaryReport?.deductions?.length &&
                  !salaryReport?.recoveries?.length && (
                    <div className="p-8 text-center text-gray-500">
                      No recent transactions found
                    </div>
                  )}
              </div>
            </div>

            {/* Lent Amounts (Payments Received) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    💰 Lent Amounts (Payments Received)
                  </h3>
                  <span className="text-sm text-green-600 font-medium">
                    Total Received: ₹
                    {salaryReport?.totalPaid?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4">
                        <Skeleton height={20} width={120} className="mb-2" />
                        <Skeleton height={16} width={80} />
                      </div>
                    ))
                  : salaryReport?.payments.map((payment) => (
                      <div key={payment.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              {payment.description}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {payment.type} •{" "}
                              {new Date(payment.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              +₹{payment.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                {(!salaryReport?.payments ||
                  salaryReport.payments.length === 0) &&
                  !loading && (
                    <div className="p-8 text-center text-gray-500">
                      No payments received for this month
                    </div>
                  )}
              </div>
            </div>

            {/* Denied Amounts (Deductions & Recoveries) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    🚫 Denied Amounts (Deductions & Recoveries)
                  </h3>
                  <span className="text-sm text-red-600 font-medium">
                    Total Deducted: ₹
                    {(salaryReport?.totalRecovered || 0)?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4">
                        <Skeleton height={20} width={120} className="mb-2" />
                        <Skeleton height={16} width={80} />
                      </div>
                    ))
                  : [
                      ...(salaryReport?.deductions || []).map((deduction) => ({
                        ...deduction,
                        category: "deduction",
                      })),
                      ...(salaryReport?.recoveries || []).map((recovery) => ({
                        ...recovery,
                        category: "recovery",
                      })),
                    ].map((item) => (
                      <div key={item.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              {item.description}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {item.type} ({item.category}) •{" "}
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">
                              -₹{item.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                {(!salaryReport?.deductions ||
                  salaryReport.deductions.length === 0) &&
                  (!salaryReport?.recoveries ||
                    salaryReport.recoveries.length === 0) &&
                  !loading && (
                    <div className="p-8 text-center text-gray-500">
                      No deductions or recoveries for this month
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
