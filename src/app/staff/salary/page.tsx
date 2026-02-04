"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertCircle,
  Check,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  useGenerateSalaryReport,
  useStaffSalaries,
  useStaffSalaryOverview,
} from "@/hooks";

interface SalaryTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
}

interface SalaryOverview {
  totalOwed: number;
  totalOwe: number;
  totalGross: number;
  totalPaid: number;
  totalDeductions: number;
  pendingAmount: number;
  monthlyBreakdown: Array<{
    month: number;
    year: number;
    gross: number;
    deductions: number;
    paid: number;
    balance: number;
    net: number;
    status: string;
  }>;
  recentTransactions: SalaryTransaction[];
  currentMonth: {
    gross: number;
    deductions: number;
    paid: number;
    balance: number;
    owed: number;
    owe: number;
    net: number;
    earnings: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
    payments: Array<{
      id: string;
      type: string;
      amount: number;
      reason: string;
      createdAt: string;
    }>;
    extraDeductions: Array<{
      id: string;
      type: string;
      amount: number;
      reason: string;
      createdAt: string;
    }>;
  };
}

export default function StaffSalaryOverviewPage() {
  const { data: session } = useSession();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [earningsExpanded, setEarningsExpanded] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "history">(
    "overview",
  );
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  // Only fetch overview on initial load - always enabled
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useStaffSalaryOverview();

  // Fetch salaries only when history tab is clicked - disabled by default
  const {
    data: salariesData,
    isLoading: salariesLoading,
    error: salariesError,
  } = useStaffSalaries(undefined, { enabled: hasLoadedHistory });
  const handleTabChange = (tab: "overview" | "history") => {
    setActiveTab(tab);
    if (tab === "history" && !hasLoadedHistory) {
      setHasLoadedHistory(true);
    }
  };

  // Compute loading state based on active tab
  const isOverviewLoading = overviewLoading;
  const isSalariesLoading = hasLoadedHistory ? salariesLoading : false;
  const loading = isOverviewLoading || isSalariesLoading;
  const error = salariesError?.message || overviewError?.message || null;
  const salaries = salariesData?.salaries || [];
  const generateReportMutation = useGenerateSalaryReport();

  const generateReport = async () => {
    try {
      const blob = await generateReportMutation.mutateAsync({ format: "pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Failed to generate report");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-blue-100 text-blue-800";
      case "PAID":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "APPROVED":
        return <CheckCircle className="h-4 w-4" />;
      case "PAID":
        return <CheckCircle className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (!session || session.user.role !== "STAFF") {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Salary Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive view of your salary details and transactions
            </p>
          </div>
          <button
            onClick={generateReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-4 md:px-8">
        <div className="flex space-x-8">
          <button
            onClick={() => handleTabChange("overview")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Salary History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {isOverviewLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white/90 rounded-xl p-6 border border-gray-200/50"
                  >
                    <Skeleton height={16} width={100} className="mb-2" />
                    <Skeleton height={32} width={120} />
                  </div>
                ))}
              </div>
            ) : (
              overview?.currentMonth && (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Current Month Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">
                        Gross Salary
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{formatCurrency(overview?.currentMonth?.gross || 0)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700 font-medium">
                        Total Deductions
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        ₹
                        {formatCurrency(
                          overview?.currentMonth?.deductions || 0,
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">
                        Payments Received
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        ₹{formatCurrency(overview?.currentMonth?.paid || 0)}
                      </p>
                    </div>
                    <div
                      className={`text-center p-4 rounded-lg ${
                        (overview?.currentMonth?.balance || 0) >= 0
                          ? "bg-green-50"
                          : "bg-red-50"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          (overview?.currentMonth?.balance || 0) >= 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        Balance
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          (overview?.currentMonth?.balance || 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        ₹
                        {formatCurrency(
                          Math.abs(overview?.currentMonth?.balance || 0),
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Monthly Breakdown */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Monthly Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deductions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isOverviewLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
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
                              <Skeleton height={16} width={60} />
                            </td>
                          </tr>
                        ))
                      : overview?.monthlyBreakdown.map((month: any) => (
                          <tr
                            key={`${month.year}-${month.month}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {new Date(
                                month.year,
                                month.month - 1,
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                              ₹{formatCurrency(month.gross)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                              ₹{formatCurrency(month.deductions)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                              ₹{formatCurrency(month.paid)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span
                                className={
                                  month.balance >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {month.balance >= 0 ? "Receivable" : "Payable"}:
                                ₹{formatCurrency(Math.abs(month.balance))}
                              </span>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Transactions
              </h3>
              <div className="space-y-3">
                {isOverviewLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <Skeleton height={20} width={200} />
                        <Skeleton height={20} width={80} />
                      </div>
                    ))
                  : overview?.recentTransactions.map((transaction: any) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-full ${
                              transaction.type === "PAYMENT"
                                ? "bg-green-100"
                                : transaction.type === "RECOVERY"
                                  ? "bg-red-100"
                                  : transaction.type === "DEDUCTION"
                                    ? "bg-orange-100"
                                    : "bg-blue-100"
                            }`}
                          >
                            {transaction.type === "PAYMENT" ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : transaction.type === "RECOVERY" ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : transaction.type === "DEDUCTION" ? (
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Receipt className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-semibold ${
                              transaction.amount >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {transaction.amount >= 0 ? "+" : ""}₹
                            {formatCurrency(Math.abs(transaction.amount))}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {transaction.type.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                {(!overview?.recentTransactions ||
                  overview.recentTransactions.length === 0) &&
                  !isOverviewLoading && (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No recent transactions</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(
                    e.target.value === "all" ? "all" : parseInt(e.target.value),
                  )
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-sm"
              >
                <option value="all">All Years</option>
                {Array.from(new Set(salaries.map((s: any) => s.year)))
                  .sort((a: any, b: any) => b - a)
                  .map((year: any) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Loading state for history */}
            {isSalariesLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50"
                  >
                    <Skeleton height={24} className="mb-2" />
                    <Skeleton height={20} />
                  </div>
                ))}
              </div>
            ) : salaries.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No salary records found
                </h3>
                <p className="text-gray-500">
                  Your salary records will appear here once processed.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {salaries
                  .filter(
                    (salary: any) =>
                      (selectedYear === "all" ||
                        salary.year === selectedYear) &&
                      (selectedStatus === "all" ||
                        salary.status === selectedStatus),
                  )
                  .sort(
                    (a: any, b: any) =>
                      new Date(b.year, b.month - 1).getTime() -
                      new Date(a.year, a.month - 1).getTime(),
                  )
                  .map((salary: any) => {
                    const isExpanded = expandedId === salary.id;
                    const earnings =
                      salary.breakdowns?.filter((b: any) =>
                        ["BASE_SALARY", "OVERTIME"].includes(b.type),
                      ) || [];
                    const deductions =
                      salary.breakdowns?.filter((b: any) =>
                        [
                          "PF_DEDUCTION",
                          "ESI_DEDUCTION",
                          "LATE_PENALTY",
                          "ABSENCE_DEDUCTION",
                        ].includes(b.type),
                      ) || [];

                    // Get ledger deductions and recoveries with dates
                    const ledgerDeductions =
                      salary.ledger?.filter(
                        (l: any) => l.type === "DEDUCTION",
                      ) || [];
                    const ledgerRecoveries =
                      salary.ledger?.filter(
                        (l: any) => l.type === "RECOVERY",
                      ) || [];
                    const ledgerPayments =
                      salary.ledger?.filter(
                        (l: any) =>
                          l.type === "PAYMENT" || l.type === "EARNING",
                      ) || [];

                    // Calculate full salary details
                    const grossEarnings = earnings.reduce(
                      (sum: number, e: any) => sum + (e.amount || 0),
                      0,
                    );
                    const totalDeductions = deductions.reduce(
                      (sum: number, d: any) => sum + Math.abs(d.amount || 0),
                      0,
                    );
                    const totalLedgerDeductions = ledgerDeductions.reduce(
                      (sum: number, d: any) => sum + Math.abs(d.amount || 0),
                      0,
                    );
                    const totalRecoveries = ledgerRecoveries.reduce(
                      (sum: number, r: any) => sum + Math.abs(r.amount || 0),
                      0,
                    );
                    const totalPayments = ledgerPayments.reduce(
                      (sum: number, p: any) => sum + (p.amount || 0),
                      0,
                    );
                    const totalDeductionsAll =
                      totalDeductions + totalLedgerDeductions + totalRecoveries;

                    // What company owes (gross earnings)
                    const companyOwes = grossEarnings;
                    // What employee owes (deductions + recoveries)
                    const employeeOwes = totalDeductionsAll;
                    // Net balance = netAmount - payments
                    const netPayable = salary.netAmount - totalPayments;

                    return (
                      <div
                        key={salary.id}
                        className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-200"
                      >
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            setExpandedId(isExpanded ? null : salary.id);
                            if (!isExpanded) setEarningsExpanded(false);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-lg font-semibold text-gray-900">
                                {formatDate(
                                  new Date(salary.year, salary.month - 1),
                                )}
                              </p>
                              <p className="text-sm text-gray-600">
                                {isExpanded ? <ArrowUp /> : <ArrowDown />}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-xl font-bold ${
                                  netPayable >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                ₹{formatCurrency(Math.abs(netPayable))}
                              </p>
                              <p className="text-sm text-gray-600">
                                {netPayable >= 0
                                  ? "Net Receivable"
                                  : "Net Payable"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isExpanded
                              ? "max-h-screen opacity-100"
                              : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="p-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50 to-blue-50/50">
                            {/* Full Salary Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-700 font-medium">
                                  Company Owes (Gross)
                                </p>
                                <p className="text-xl font-bold text-green-600">
                                  ₹{formatCurrency(companyOwes)}
                                </p>
                              </div>
                              <div className="text-center p-4 bg-red-50 rounded-lg">
                                <p className="text-sm text-red-700 font-medium">
                                  Employee Owes (Deductions)
                                </p>
                                <p className="text-xl font-bold text-red-600">
                                  ₹{formatCurrency(employeeOwes)}
                                </p>
                              </div>
                              <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-700 font-medium">
                                  Payments Received
                                </p>
                                <p className="text-xl font-bold text-blue-600">
                                  ₹{formatCurrency(totalPayments)}
                                </p>
                              </div>
                              <div
                                className={`text-center p-4 rounded-lg ${
                                  netPayable >= 0 ? "bg-green-50" : "bg-red-50"
                                }`}
                              >
                                <p
                                  className={`text-sm font-medium ${
                                    netPayable >= 0
                                      ? "text-green-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  Net{" "}
                                  {netPayable >= 0 ? "Receivable" : "Payable"}
                                </p>
                                <p
                                  className={`text-xl font-bold ${
                                    netPayable >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  ₹{formatCurrency(Math.abs(netPayable))}
                                </p>
                              </div>
                            </div>

                            {/* Month and Status */}
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <p className="text-sm text-gray-600">
                                  {formatDate(
                                    new Date(salary.year, salary.month - 1),
                                  )}
                                </p>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(salary.status)}`}
                                >
                                  {getStatusIcon(salary.status)}
                                  <span className="ml-1">{salary.status}</span>
                                </span>
                              </div>
                            </div>

                            {/* Earnings */}
                            <div className="mb-4">
                              <button
                                onClick={() =>
                                  setEarningsExpanded(!earningsExpanded)
                                }
                                className="w-full text-left flex justify-between items-center p-3 bg-white/80 rounded-lg border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200"
                              >
                                <span className="font-semibold">Earnings</span>
                                <span>
                                  {earningsExpanded ? (
                                    <ArrowDown />
                                  ) : (
                                    <ArrowUp />
                                  )}
                                </span>
                              </button>
                              {earningsExpanded && (
                                <div className="mt-2 space-y-2">
                                  {earnings.map(
                                    (breakdown: any, index: any) => (
                                      <div
                                        key={index}
                                        className="flex justify-between"
                                      >
                                        <span className="text-gray-700">
                                          {breakdown.description}
                                        </span>
                                        <span className="font-medium">
                                          ₹{formatCurrency(breakdown.amount)}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Deductions */}
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">
                                Deductions & Recoveries
                              </h4>
                              <div className="space-y-2">
                                {/* Salary breakdown deductions */}
                                {deductions.map(
                                  (breakdown: any, index: any) => (
                                    <div
                                      key={`breakdown-${index}`}
                                      className="flex justify-between"
                                    >
                                      <span className="text-gray-700">
                                        {breakdown.description}
                                      </span>
                                      <span className="font-medium text-red-600">
                                        ₹
                                        {formatCurrency(
                                          Math.abs(breakdown.amount),
                                        )}
                                      </span>
                                    </div>
                                  ),
                                )}
                                {/* Ledger deductions with dates */}
                                {ledgerDeductions.map((deduction: any) => (
                                  <div
                                    key={deduction.id}
                                    className="flex justify-between"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-gray-700">
                                        {deduction.reason ||
                                          deduction.description ||
                                          "Deduction"}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(
                                          deduction.createdAt,
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <span className="font-medium text-red-600">
                                      -₹
                                      {formatCurrency(
                                        Math.abs(deduction.amount),
                                      )}
                                    </span>
                                  </div>
                                ))}
                                {/* Ledger recoveries with dates */}
                                {ledgerRecoveries.map((recovery: any) => (
                                  <div
                                    key={recovery.id}
                                    className="flex justify-between"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-gray-700">
                                        {recovery.reason ||
                                          recovery.description ||
                                          "Recovery"}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(
                                          recovery.createdAt,
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <span className="font-medium text-red-600">
                                      -₹
                                      {formatCurrency(
                                        Math.abs(recovery.amount),
                                      )}
                                    </span>
                                  </div>
                                ))}
                                {deductions.length === 0 &&
                                  ledgerDeductions.length === 0 &&
                                  ledgerRecoveries.length === 0 && (
                                    <p className="text-gray-500">
                                      No deductions or recoveries
                                    </p>
                                  )}
                              </div>
                            </div>

                            {/* Payments */}
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">Payments</h4>
                              <div className="space-y-2">
                                {/* Ledger payments with dates */}
                                {ledgerPayments.length > 0 ? (
                                  ledgerPayments.map((payment: any) => (
                                    <div
                                      key={payment.id}
                                      className="flex justify-between"
                                    >
                                      <div className="flex flex-col">
                                        <span className="text-gray-700">
                                          {payment.reason ||
                                            payment.description ||
                                            "Payment"}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(
                                            payment.createdAt,
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <span className="font-medium text-green-600">
                                        +₹{formatCurrency(payment.amount)}
                                      </span>
                                    </div>
                                  ))
                                ) : salary.paidAt ? (
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">
                                      {new Date(
                                        salary.paidAt,
                                      ).toLocaleDateString()}
                                    </span>
                                    <span className="font-medium">
                                      ₹{formatCurrency(salary.netAmount)}
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-gray-500">
                                    No payments recorded
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Closing Balance */}
                            <div>
                              <h4 className="font-semibold mb-2">
                                Final Balance
                              </h4>
                              <p
                                className={`text-lg font-bold ${
                                  netPayable >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {netPayable >= 0 ? "Receivable" : "Payable"}: ₹
                                {formatCurrency(Math.abs(netPayable))}
                              </p>
                            </div>

                            {/* PDF Download */}
                            {salary.status === "PAID" && salary.pdfUrl && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <a
                                  href={salary.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Salary Slip
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
