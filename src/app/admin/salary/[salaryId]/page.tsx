"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle,
  XCircle,
  Download,
  DollarSign,
  Calendar,
  User,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import SalaryMarkPaidModal from "@/components/admin/SalaryMarkPaidModal";
import { useModal } from "@/components/ModalProvider";

interface SalaryDetail {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
  month: number;
  year: number;
  totalDays: number;
  approvedDays: number;
  grossAmount: number;
  netAmount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
}

interface ChartData {
  date: string;
  status: string;
}

export default function AdminSalaryDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const salaryId = params.salaryId as string;
  const { showMessage } = useModal();

  const [salary, setSalary] = useState<SalaryDetail | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false);

  useEffect(() => {
    if (salaryId) {
      fetchSalaryDetail();
    }
  }, [salaryId]);

  const fetchSalaryDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/salary/${salaryId}`);
      const data = await res.json();

      if (res.ok) {
        setSalary(data.salary);
        setChartData(data.chartData);
      } else {
        setError(data.error || "Failed to fetch salary detail");
      }
    } catch (error) {
      setError("Failed to fetch salary detail");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = () => {
    setMarkPaidModalOpen(true);
  };

  const handleMarkPaidConfirm = async (
    salaryId: string,
    paymentData: {
      date: string;
      method: string;
      reference?: string;
      sendNotification?: boolean;
    },
  ) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/salary/${salaryId}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: paymentData.date,
          method: paymentData.method,
          reference: paymentData.reference,
          sendNotification: paymentData.sendNotification ?? true,
        }),
      });

      if (res.ok) {
        await fetchSalaryDetail(); // Refresh
      } else {
        const data = await res.json();
        showMessage(
          "error",
          "Error",
          data.error || "Failed to mark salary as paid",
        );
      }
    } catch (error) {
      console.error("Failed to mark salary as paid:", error);
      showMessage("error", "Error", "Failed to mark salary as paid");
    } finally {
      setUpdating(false);
    }
  };

  const generatePayslipPDF = () => {
    showMessage(
      "info",
      "Coming Soon",
      "PDF generation feature coming soon. Please use print for now.",
    );
    window.print();
  };

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

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/admin/salary"
          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          aria-label="Back to salary list"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Salary Detail
          </h1>
          <p className="mt-2 text-gray-600">Detailed view of salary record</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Staff Details */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Staff Details
        </h2>
        {loading ? (
          <div className="space-y-4">
            <Skeleton height={20} width={200} />
            <Skeleton height={16} width={150} />
            <Skeleton height={16} width={180} />
          </div>
        ) : salary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {salary.user.firstName} {salary.user.lastName}
                </p>
                <p className="text-sm text-gray-500">{salary.user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {months[salary.month - 1]} {salary.year}
                </p>
                <p className="text-sm text-gray-500">Salary Period</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Salary Breakdown */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Salary Breakdown
        </h2>
        {loading ? (
          <div className="space-y-4">
            <Skeleton height={20} width={150} />
            <Skeleton height={20} width={150} />
            <Skeleton height={20} width={150} />
          </div>
        ) : salary ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Approved Days</p>
              <p className="text-2xl font-bold text-blue-600">
                {salary.approvedDays}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Gross Amount</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{salary.grossAmount.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Net Amount</p>
              <p className="text-2xl font-bold text-purple-600">
                ₹{salary.netAmount.toLocaleString()}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      {salary && salary.status === "PENDING" && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex space-x-4">
            <button
              onClick={handleMarkAsPaid}
              disabled={updating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {updating ? "Updating..." : "Mark as Paid"}
            </button>
            <button
              onClick={generatePayslipPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Payslip
            </button>
          </div>
        </div>
      )}

      {salary && salary.status === "PAID" && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <button
            onClick={generatePayslipPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Payslip
          </button>
        </div>
      )}

      {/* Charts */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Monthly Attendance Status
        </h2>
        {loading ? (
          <Skeleton height={300} />
        ) : (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="status" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Mark Paid Modal */}
      <SalaryMarkPaidModal
        isOpen={markPaidModalOpen}
        onClose={() => setMarkPaidModalOpen(false)}
        salary={salary}
        onMarkPaid={handleMarkPaidConfirm}
      />
    </div>
  );
}
