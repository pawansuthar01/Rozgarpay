"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Eye,
  Download,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Lock,
  Share2,
  BookDown,
  ArrowDownZaIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";

interface Salary {
  id: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  totalWorkingHours: number;
  overtimeHours: number;
  lateMinutes: number;
  halfDays: number;
  absentDays: number;
  baseAmount: number;
  overtimeAmount: number;
  penaltyAmount: number;
  deductions: number;
  grossAmount: number;
  netAmount: number;
  status: string;
  paidAt?: string;
  approvedByUser?: {
    firstName: string;
    lastName: string;
  };
  breakdowns: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
}

export default function StaffSalaryOverviewPage() {
  const { data: session } = useSession();
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [earningsExpanded, setEarningsExpanded] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    fetchSalaries();
  }, []);

  const fetchSalaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/salary`);
      const data = await res.json();

      if (res.ok) {
        setSalaries(data.salaries || []);
      } else {
        setError(data.error || "Failed to fetch salaries");
        setSalaries([]);
      }
    } catch (error) {
      console.error("Failed to fetch salaries:", error);
      setError("Failed to fetch salaries");
      setSalaries([]);
    } finally {
      setLoading(false);
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
    return <div>Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-4 py-6 md:px-8 md:py-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Salary History</h1>
            <p className="text-sm text-gray-600 mt-1">
              View your salary records by date
            </p>
          </div>
          {/* Filters */}
          <div className="flex gap-3">
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
              {Array.from(new Set(salaries.map((s) => s.year)))
                .sort((a, b) => b - a)
                .map((year) => (
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
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-lg"
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
                (salary) =>
                  (selectedYear === "all" || salary.year === selectedYear) &&
                  (selectedStatus === "all" ||
                    salary.status === selectedStatus),
              )
              .sort(
                (a, b) =>
                  new Date(b.year, b.month - 1).getTime() -
                  new Date(a.year, a.month - 1).getTime(),
              )
              .map((salary) => {
                const isExpanded = expandedId === salary.id;
                const earnings = salary.breakdowns.filter((b) =>
                  ["BASE_SALARY", "OVERTIME"].includes(b.type),
                );
                const deductions = salary.breakdowns.filter((b) =>
                  [
                    "PF_DEDUCTION",
                    "ESI_DEDUCTION",
                    "LATE_PENALTY",
                    "ABSENCE_DEDUCTION",
                  ].includes(b.type),
                );
                const payments = salary.paidAt
                  ? [{ amount: salary.netAmount, date: salary.paidAt }]
                  : [];
                const closingBalance =
                  salary.status === "PAID" ? 0 : salary.netAmount;

                return (
                  <div
                    key={salary.id}
                    className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/50 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200"
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
                            {!isExpanded ? <ArrowDown /> : <ArrowUp />}{" "}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            ₹{salary.netAmount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Net Receivable
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Due Amount</p>
                            <p className="text-lg font-semibold">
                              ₹{salary.netAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Full Date</p>
                            <p className="text-lg font-semibold">
                              {formatDate(
                                new Date(salary.year, salary.month - 1),
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Net Receivable
                            </p>
                            <p className="text-lg font-semibold text-green-600">
                              ₹{salary.netAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Payable</p>
                            <p className="text-lg font-semibold">
                              ₹{salary.netAmount.toLocaleString()}
                            </p>
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
                              {earningsExpanded ? <ArrowDown /> : <ArrowUp />}
                            </span>
                          </button>
                          {earningsExpanded && (
                            <div className="mt-2 space-y-2">
                              {earnings.map((breakdown, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between"
                                >
                                  <span className="text-gray-700">
                                    {breakdown.description}
                                  </span>
                                  <span className="font-medium">
                                    ₹{breakdown.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Deductions */}
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">Deductions</h4>
                          <div className="space-y-2">
                            {deductions.map((breakdown, index) => (
                              <div key={index} className="flex justify-between">
                                <span className="text-gray-700">
                                  {breakdown.description}
                                </span>
                                <span className="font-medium text-red-600">
                                  ₹{Math.abs(breakdown.amount).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payments */}
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">Payments</h4>
                          <div className="space-y-2">
                            {payments.length > 0 ? (
                              payments.map((payment, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between"
                                >
                                  <span className="text-gray-700">
                                    {new Date(
                                      payment.date,
                                    ).toLocaleDateString()}
                                  </span>
                                  <span className="font-medium">
                                    ₹{payment.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))
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
                            Closing Balance
                          </h4>
                          <p className="text-lg font-bold text-blue-600">
                            ₹{closingBalance.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
