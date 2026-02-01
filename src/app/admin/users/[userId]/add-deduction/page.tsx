"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MinusCircle,
  Calendar,
  DollarSign,
  FileText,
  Save,
} from "lucide-react";
import { useAddDeduction } from "@/hooks";
import { useModal } from "@/components/ModalProvider";

export default function AddDeductionPage() {
  const { data: session } = useSession();
  const { showMessage } = useModal();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [formData, setFormData] = useState({
    cycle: "monthly", // monthly, quarterly, etc. - shown first
    recordDate: new Date().toISOString().split("T")[0],
    amount: "",
    description: "",
  });

  // Use the custom hook
  const addDeductionMutation = useAddDeduction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.recordDate) {
      showMessage("error", "Error", "Please fill in all required fields");
      return;
    }

    try {
      await addDeductionMutation.mutateAsync(
        {
          userId,
          data: {
            ...formData,
            amount: parseFloat(formData.amount),
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

      // Success - refresh parent page and navigate back
      if (window.opener) {
        window.opener.location.reload();
      }
      router.push(`/admin/users/${userId}`);
    } catch (error) {
      // Error is handled by the mutation
      console.error("Failed to add deduction:", error);
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
            Add Deduction
          </h1>
          <p className="mt-2 text-gray-600">
            Record a new deduction for this user
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cycle - shown first */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cycle *
            </label>
            <select
              value={formData.cycle}
              onChange={(e) => handleInputChange("cycle", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half-yearly">Half Yearly</option>
              <option value="yearly">Yearly</option>
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

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-red-600" />
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
              disabled={addDeductionMutation.isPending}
              className="px-6 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 hover:shadow-lg flex items-center"
            >
              {addDeductionMutation.isPending ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Add Deduction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
