"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Filter,
  BarChart3,
  Wallet,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useStaff } from "@/hooks";
import { useModal } from "@/components/ModalProvider";

export default function AdminReportsPage() {
  const { data: session } = useSession();
  const { showMessage } = useModal();
  const [reportType, setReportType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<string>("pdf");
  const [isExporting, setIsExporting] = useState(false);

  // Get real stats data
  const { data: staffData } = useStaff({
    page: 1,
    limit: 1, // Just need stats
  });

  const handleExport = async () => {
    if (!reportType || !startDate || !endDate) {
      showMessage(
        "warning",
        "Validation Error",
        "Please select report type and date range",
      );
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        format: exportFormat,
      });

      // Fetch report data and generate file
      const response = await fetch(
        `/api/admin/reports/${reportType}?${params}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      // Get the blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${reportType}-report-${timestamp}.${exportFormat}`;

      // Create and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      showMessage(
        "error",
        "Export Failed",
        error instanceof Error ? error.message : "Failed to generate report",
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

  const reportTypes = [
    {
      id: "attendance",
      title: "Attendance Report",
      description:
        "View attendance trends, staff summaries, and late/absent counts",
      icon: TrendingUp,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      href: "/admin/reports/attendance",
    },
    {
      id: "salary",
      title: "Salary Report",
      description:
        "Monthly payroll reports, total payouts, and staff breakdowns",
      icon: DollarSign,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      href: "/admin/reports/salary",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        {/* Header - Mobile optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 sm:p-3 rounded-xl shadow-sm">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  📊 Reports
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-0.5">
                  Generate and export comprehensive reports
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Types - Enhanced mobile design */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Available Reports
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <Link
                  key={report.id}
                  href={report.href}
                  className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-lg ${report.bgColor} group-hover:scale-110 transition-transform duration-200`}
                    >
                      <Icon
                        className={`h-6 w-6 sm:h-8 sm:w-8 ${report.color.replace("bg-", "text-")}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-gray-700">
                        {report.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                        {report.description}
                      </p>
                      <div className="flex items-center mt-3 text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700">
                        View Report
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Export - Mobile optimized */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Download className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Quick Export
                </h2>
                <p className="text-sm text-gray-600">
                  Generate and download reports instantly
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Report</option>
                  <option value="attendance">Attendance Report</option>
                  <option value="salary">Salary Report</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting || !reportType || !startDate || !endDate}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile bottom spacing */}
        <div className="h-4 sm:h-6"></div>
      </div>
    </div>
  );
}
