"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Calculator, CheckCircle, XCircle } from "lucide-react";

interface SalaryPreview {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  salary: {
    totalWorkingDays: number;
    grossAmount: number;
    netAmount: number;
  };
  breakdowns?: any[];
  error?: string;
}

export default function AdminSalaryGeneratePage() {
  const { data: session } = useSession();
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [salaries, setSalaries] = useState<SalaryPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const months = [
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

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i,
  );

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setSalaries([]);
    try {
      const res = await fetch("/api/admin/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, action: "preview" }),
      });

      const data = await res.json();

      if (res.ok) {
        setSalaries(data.previews);
      } else {
        setError(data.error || "Failed to calculate salaries");
      }
    } catch (error) {
      console.error("Failed to calculate salaries:", error);
      setError("Failed to calculate salaries");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, action: "generate" }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`Successfully generated ${data.count} salary records`);
        setSalaries([]);
      } else {
        setError(data.error || "Failed to generate salaries");
      }
    } catch (error) {
      console.error("Failed to generate salaries:", error);
      setError("Failed to generate salaries");
    } finally {
      setGenerating(false);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Generate Salaries
          </h1>
          <p className="mt-2 text-gray-600">
            Calculate and generate monthly salary records based on approved
            attendance
          </p>
        </div>
      </div>

      {/* Selection */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Select Month & Year
        </h2>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {loading ? "Calculating..." : "Calculate"}
          </button>
        </div>
      </div>

      {/* Error/Success */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {salaries.length > 0 && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Salary Preview
            </h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Salaries"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Working Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salaries.map((salary, index) => (
                  <tr
                    key={salary.user.id || index}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {salary.user.firstName} {salary.user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {salary.user.email}
                      </div>
                      {salary.error && (
                        <div className="text-sm text-red-600 mt-1">
                          Error: {salary.error}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salary.salary?.totalWorkingDays || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{salary.salary?.grossAmount?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{salary.salary?.netAmount?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
