"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  BarChart3,
  FileSpreadsheet,
  File,
} from "lucide-react";

export default function ManagerReports() {
  const { data: session } = useSession();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  if (!session || session.user.role !== "MANAGER") {
    return <Loading />;
  }

  const handleExport = async (
    format: "pdf" | "excel",
    type: "attendance" | "salary",
  ) => {
    if (!dateFrom || !dateTo) {
      alert("Please select date range");
      return;
    }

    setExporting(`${type}-${format}`);

    try {
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        format,
      });

      const response = await fetch(
        `/api/manager/reports/${type}/export?${params}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-report-${dateFrom}-to-${dateTo}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to generate report");
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export report");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Reports
          </h1>
          <p className="mt-2 text-gray-600">
            Generate and download attendance and salary reports.
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Report Filters
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Attendance Reports */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Attendance Reports
              </h2>
              <p className="text-sm text-gray-600">
                Generate detailed attendance reports for your team
              </p>
            </div>
          </div>
          <Link
            href="/manager/reports/attendance"
            className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            View Details
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleExport("pdf", "attendance")}
            disabled={exporting === "attendance-pdf"}
            className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <File className="h-4 w-4 mr-2" />
            {exporting === "attendance-pdf" ? "Generating..." : "Export PDF"}
          </button>
          <button
            onClick={() => handleExport("excel", "attendance")}
            disabled={exporting === "attendance-excel"}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {exporting === "attendance-excel"
              ? "Generating..."
              : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Salary Reports */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Salary Reports
              </h2>
              <p className="text-sm text-gray-600">
                Generate salary and payroll reports
              </p>
            </div>
          </div>
          <Link
            href="/manager/reports/salary"
            className="px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            View Details
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleExport("pdf", "salary")}
            disabled={exporting === "salary-pdf"}
            className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <File className="h-4 w-4 mr-2" />
            {exporting === "salary-pdf" ? "Generating..." : "Export PDF"}
          </button>
          <button
            onClick={() => handleExport("excel", "salary")}
            disabled={exporting === "salary-excel"}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {exporting === "salary-excel" ? "Generating..." : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/manager/attendance"
            className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <FileText className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Manage Attendance</p>
              <p className="text-sm text-gray-600">
                Review and approve attendance records
              </p>
            </div>
          </Link>

          <Link
            href="/manager/team"
            className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <BarChart3 className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Team Overview</p>
              <p className="text-sm text-gray-600">
                Monitor team performance and attendance
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
