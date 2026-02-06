"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRecoverPayment } from "@/hooks/useSalary";
import {
  ArrowLeft,
  RotateCcw,
  Calendar,
  IndianRupee,
  FileText,
  Save,
  AlertCircle,
} from "lucide-react";
import { useModal } from "@/components/ModalProvider";

interface Payment {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  type: string;
}

export default function RecoverPaymentPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { showMessage } = useModal();
  const [formData, setFormData] = useState({
    amount: "",
    recoverDate: new Date().toISOString().split("T")[0],
    reason: "Staff payment recovery",
  });

  const recoverPaymentMutation = useRecoverPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.recoverDate) {
      showMessage("info", "Messing Info", "Please fill in all required fields");
      return;
    }

    const recoverAmount = parseFloat(formData.amount);
    if (recoverAmount <= 0) {
      showMessage(
        "info",
        "Recover Amount",
        "Recovery amount must be greater than 0",
      );
      return;
    }

    try {
      await recoverPaymentMutation.mutateAsync(
        {
          userId,
          data: {
            amount: recoverAmount,
            recoverDate: formData.recoverDate,
            reason: formData.reason,
          },
        },
        {
          onError: (error) => {
            showMessage(
              "error",
              "Error",
              error.message || "Failed to recover payment",
            );
          },
        },
      );

      router.push(`/admin/users/${userId}`);
    } catch (error: any) {
      showMessage(
        "error",
        "Error",
        error.message || error.error || "Failed to recover payment",
      );
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          href={`/admin/users/${userId}`}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Staff Paid Company
          </h1>
          <p className="mt-2 text-gray-600">
            Record when staff member gives money back to the company
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Recovery Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <RotateCcw className="h-4 w-4 mr-2 text-red-600" />
              Amount Staff Paid *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="0.00"
              required
            />
          </div>

          {/* Recovery Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-purple-600" />
              Recovery Date *
            </label>
            <input
              type="date"
              value={formData.recoverDate}
              onChange={(e) => handleInputChange("recoverDate", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-gray-600" />
              Reason *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange("reason", e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
              placeholder="Reason for this payment..."
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href={`/admin/users/${userId}`}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={recoverPaymentMutation.isPending}
              className="px-6 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 hover:shadow-lg flex items-center"
            >
              {recoverPaymentMutation.isPending ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Record Staff Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
