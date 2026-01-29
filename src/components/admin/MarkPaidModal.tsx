"use client";

import { useState } from "react";
import { X, Calendar, CreditCard, FileText, Bell, BellOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    date: string;
    method: string;
    reference?: string;
    sendNotification: boolean;
  }) => Promise<void>;
  salaryAmount: number;
  staffName: string;
  month: number;
  year: number;
  loading?: boolean;
}

export default function MarkPaidModal({
  isOpen,
  onClose,
  onSubmit,
  salaryAmount,
  staffName,
  month,
  year,
  loading = false,
}: MarkPaidModalProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    method: "Bank",
    reference: "",
    sendNotification: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = "Payment date is required";
    }

    if (!formData.method) {
      newErrors.method = "Payment method is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        method: "Bank",
        reference: "",
        sendNotification: false,
      });
      setErrors({});
    } catch (error) {
      console.error("Failed to mark as paid:", error);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setErrors({});
    }
  };

  if (!isOpen) return null;

  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 bg-opacity-50">
      {/* Modal panel - Centered, compact */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <CreditCard className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Mark as Paid
                </h3>
                <p className="text-xs text-gray-600">
                  {staffName} • {monthName} {year}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* Salary Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-900">Amount</p>
                <p className="text-lg font-bold text-green-600">
                  ₹{formatCurrency(salaryAmount)}
                </p>
              </div>
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Payment Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Payment Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.date ? "border-red-300" : "border-gray-300"
                  }`}
                  disabled={loading}
                />
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              {errors.date && (
                <p className="mt-1 text-xs text-red-600">{errors.date}</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <div className="relative">
                <select
                  value={formData.method}
                  onChange={(e) =>
                    setFormData({ ...formData, method: e.target.value })
                  }
                  className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.method ? "border-red-300" : "border-gray-300"
                  }`}
                  disabled={loading}
                >
                  <option value="Bank">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
                <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              {errors.method && (
                <p className="mt-1 text-xs text-red-600">{errors.method}</p>
              )}
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reference
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  placeholder="Transaction ID, etc."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={loading}
                />
                <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Send Notification */}
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                {formData.sendNotification ? (
                  <Bell className="h-4 w-4 text-blue-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <p className="text-xs font-medium text-blue-900">
                    Send Notification
                  </p>
                  <p className="text-xs text-blue-700">Notify {staffName}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sendNotification}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sendNotification: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                  disabled={loading}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-3 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-3 w-3 mr-1" />
                Mark Paid
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
