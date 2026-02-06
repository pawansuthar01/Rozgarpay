"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAddPayment } from "@/hooks/useSalary";
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  IndianRupee,
  FileText,
  Save,
} from "lucide-react";
import { useModal } from "@/components/ModalProvider";

export default function AddPaymentPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { showMessage } = useModal();
  const [formData, setFormData] = useState({
    amount: "",
    mode: "cash",
    recordDate: new Date().toISOString().split("T")[0],
    description: "Monthly Salary Payment",
  });

  const addPaymentMutation = useAddPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.recordDate) {
      showMessage("info", "Messing Info", "Please fill in all required fields");
      return;
    }

    try {
      await addPaymentMutation.mutateAsync({
        userId,
        data: {
          amount: parseFloat(formData.amount),
          reason: formData.description,
          paymentDate: formData.recordDate,
          mode: formData.mode,
        },
      });

      router.push(`/admin/users/${userId}`);
    } catch (error: any) {
      showMessage(
        "error",
        "Error",
        error.message || error.error || "Failed to add payment",
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
            Add Payment
          </h1>
          <p className="mt-2 text-gray-600">
            Record a new payment for this user
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <IndianRupee className="h-4 w-4 mr-2 text-green-600" />
              Amount *
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

          {/* Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
              Payment Mode *
            </label>
            <select
              value={formData.mode}
              onChange={(e) => handleInputChange("mode", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            >
              <option value="Bank">Bank</option>
              <option value="cash">cash</option>
              <option value="cheque">cheque</option>
              <option value="upi">upi</option>
            </select>
          </div>

          {/* Record Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-purple-600" />
              Record Date *
            </label>
            <input
              type="date"
              value={formData.recordDate}
              onChange={(e) => handleInputChange("recordDate", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-gray-600" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
              placeholder="Optional description or notes..."
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
              disabled={addPaymentMutation.isPending}
              className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 hover:shadow-lg flex items-center"
            >
              {addPaymentMutation.isPending ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Add Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
