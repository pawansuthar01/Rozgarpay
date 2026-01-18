"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Download, ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";

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
  type: string;
  status: string;
  paidAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    joiningDate?: Date | null;
    salaryType?: string | null;
  };
  company: {
    name: string;
    description?: string | null;
  };
  approvedByUser?: {
    firstName: string | null;
    lastName: string | null;
  };
  rejectedByUser?: {
    firstName: string | null;
    lastName: string | null;
  };
  breakdowns: Array<{
    type: string;
    description: string;
    amount: number;
    hours?: number;
    quantity?: number;
  }>;
}

export default function SalarySlipPage() {
  const { data: session } = useSession();
  const params = useParams();
  const salaryId = params.salaryId as string;

  const [salary, setSalary] = useState<Salary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalary();
  }, [salaryId]);

  const fetchSalary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/salary/${salaryId}`);
      const data = await res.json();

      if (res.ok) {
        setSalary(data.salary);
      } else {
        setError(data.error || "Failed to fetch salary details");
      }
    } catch (error) {
      console.error("Failed to fetch salary:", error);
      setError("Failed to fetch salary details");
    } finally {
      setLoading(false);
    }
  };

  const numberToWords = (num: number): string => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];

    const convertHundreds = (n: number): string => {
      if (n === 0) return "";
      let result = "";
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + " ";
        return result.trim();
      }
      if (n > 0) {
        result += ones[n] + " ";
      }
      return result.trim();
    };

    if (num === 0) return "Zero";

    let result = "";
    let crore = Math.floor(num / 10000000);
    let lakh = Math.floor((num % 10000000) / 100000);
    let thousand = Math.floor((num % 100000) / 1000);
    let hundreds = num % 1000;

    if (crore > 0) {
      result += convertHundreds(crore) + " Crore ";
    }
    if (lakh > 0) {
      result += convertHundreds(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      result += convertHundreds(thousand) + " Thousand ";
    }
    if (hundreds > 0) {
      result += convertHundreds(hundreds);
    }

    return result.trim() + " Rupees Only";
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/staff/salary/${salaryId}/download`, {
        method: "GET",
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SalarySlip_${salary?.month}_${salary?.year}_${salary?.user.firstName}_${salary?.user.lastName}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to download PDF");
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download PDF");
    }
  };

  const handleShare = async () => {
    if (!salary) return;
    const shareData = {
      title: `Salary Slip - ${new Date(salary.year, salary.month - 1).toLocaleString("default", { month: "long", year: "numeric" })}`,
      text: `My salary slip for ${new Date(salary.year, salary.month - 1).toLocaleString("default", { month: "long", year: "numeric" })} - Net Pay: ₹${salary.netAmount.toLocaleString()}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`,
        );
        alert("Salary slip details copied to clipboard!");
      }
    } catch (error) {
      console.error("Share error:", error);
      alert("Failed to share salary slip");
    }
  };

  if (!session || session.user.role !== "STAFF") {
    return <div>Access Denied</div>;
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <Skeleton height={600} />
      </div>
    );
  }

  if (error || !salary) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error || "Salary not found"}</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <Link
            href="/staff/salary"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Link>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>
            <button
              onClick={handleShare}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Payslip */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {salary.company.name}
              </h1>
              <p className="text-blue-100 mt-1">{salary.company.description}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold">SALARY SLIP</h2>
              <p className="text-blue-100">
                {new Date(salary.year, salary.month - 1).toLocaleString(
                  "default",
                  {
                    month: "long",
                    year: "numeric",
                  },
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Employee Details */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Employee Information
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Employee Name:</span>{" "}
                  {salary.user.firstName} {salary.user.lastName}
                </p>
                <p>
                  <span className="font-medium">Employee ID:</span>{" "}
                  {salary.user.id}
                </p>
                <p>
                  <span className="font-medium">Role:</span> {salary.user.role}
                </p>
                <p>
                  <span className="font-medium">Salary Type:</span>{" "}
                  {salary.user.salaryType || salary.type}
                </p>
                {salary.user.joiningDate && (
                  <p>
                    <span className="font-medium">Joining Date:</span>{" "}
                    {new Date(salary.user.joiningDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Payslip Period
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Month:</span>{" "}
                  {new Date(salary.year, salary.month - 1).toLocaleString(
                    "default",
                    { month: "long" },
                  )}
                </p>
                <p>
                  <span className="font-medium">Year:</span> {salary.year}
                </p>
                <p>
                  <span className="font-medium">Status:</span>
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      salary.status === "PAID"
                        ? "bg-green-100 text-green-800"
                        : salary.status === "APPROVED"
                          ? "bg-blue-100 text-blue-800"
                          : salary.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                    }`}
                  >
                    {salary.status}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Attendance Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {salary.totalWorkingDays - salary.halfDays - salary.absentDays}
              </p>
              <p className="text-sm text-gray-600">Full Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {salary.halfDays}
              </p>
              <p className="text-sm text-gray-600">Half Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {salary.absentDays}
              </p>
              <p className="text-sm text-gray-600">Absent Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {salary.lateMinutes}
              </p>
              <p className="text-sm text-gray-600">Late Minutes</p>
            </div>
          </div>
        </div>

        {/* Earnings and Deductions */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Earnings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Earnings
              </h3>
              <div className="space-y-3">
                {earnings.map((breakdown, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-700">
                      {breakdown.description}
                    </span>
                    <span className="font-medium">
                      ₹{breakdown.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Earnings</span>
                    <span>₹{salary.grossAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Deductions
              </h3>
              <div className="space-y-3">
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
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Deductions</span>
                    <span className="text-red-600">
                      ₹{salary.deductions.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Section */}
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="mb-2">
              <span className="text-2xl font-bold text-gray-900">NET PAY</span>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              ₹{salary.netAmount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-700">
              {numberToWords(salary.netAmount)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p>
                <span className="font-medium">Salary Status:</span>{" "}
                {salary.status}
              </p>
              {salary.approvedByUser && (
                <p>
                  <span className="font-medium">Approved By:</span>{" "}
                  {salary.approvedByUser.firstName}{" "}
                  {salary.approvedByUser.lastName}
                </p>
              )}
              {salary.approvedAt && (
                <p>
                  <span className="font-medium">Approved Date:</span>{" "}
                  {new Date(salary.approvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p>Generated on: {new Date().toLocaleDateString()}</p>
              <p className="text-xs mt-1">This is a system-generated payslip</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
