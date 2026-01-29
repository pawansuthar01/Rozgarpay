"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Calendar, FileText, Save, Bell } from "lucide-react";

interface SalaryMarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  salary: {
    id: string;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    month: number;
    year: number;
    netAmount: number;
  } | null;
  onMarkPaid: (
    salaryId: string,
    paymentData: {
      date: string;
      method: string;
      reference?: string;
      sendNotification?: boolean;
    },
  ) => Promise<void>;
}

export default function SalaryMarkPaidModal({
  isOpen,
  onClose,
  salary,
  onMarkPaid,
}: SalaryMarkPaidModalProps) {
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [sendNotification, setSendNotification] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set default payment date to today
      const today = new Date().toISOString().split("T")[0];
      setPaymentDate(today);
      setPaymentMethod("");
      setPaymentReference("");
      setSendNotification(true);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!salary || !paymentDate || !paymentMethod) return;

    setSaving(true);
    try {
      await onMarkPaid(salary.id, {
        date: paymentDate,
        method: paymentMethod,
        reference: paymentReference.trim() || undefined,
        sendNotification,
      });
      onClose();
    } catch (error) {
      console.error("Failed to mark salary as paid:", error);
      alert("Failed to mark salary as paid");
    } finally {
      setSaving(false);
    }
  };

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque", label: "Cheque" },
    { value: "upi", label: "UPI" },
    { value: "other", label: "Other" },
  ];

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

  if (!isOpen || !salary) return null;

  return (
    <>
      {/* Desktop Modal */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Mark Salary as Paid
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {salary.user.firstName} {salary.user.lastName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-105"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
            {/* Salary Info Card */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">₹</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {months[salary.month - 1]} {salary.year}
                    </h4>
                    <p className="text-sm text-gray-600">{salary.user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    ₹{salary.netAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Net Amount</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              {/* Payment Date */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="p-1.5 bg-blue-100 rounded-lg mr-3 group-focus-within:bg-blue-200 transition-colors">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>

              {/* Payment Method */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="p-1.5 bg-green-100 rounded-lg mr-3 group-focus-within:bg-green-200 transition-colors">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                  required
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Reference */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="p-1.5 bg-purple-100 rounded-lg mr-3 group-focus-within:bg-purple-200 transition-colors">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                  placeholder="Transaction ID, Cheque number, etc. (optional)"
                />
              </div>

              {/* Send Notification */}
              <div className="group">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendNotification}
                    onChange={(e) => setSendNotification(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-orange-100 rounded-lg">
                      <Bell className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      Send notification to staff
                    </span>
                  </div>
                </label>
                <p className="text-xs text-gray-500 mt-2 ml-7">
                  Staff will receive a notification that their salary has been
                  paid
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 hover:shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !paymentDate || !paymentMethod}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 hover: hover:scale-105 flex items-center"
            >
              {saving ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Mark as Paid
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-out"
        style={{ transform: isOpen ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Mark Salary as Paid
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-5">
            {/* Salary Info */}
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {salary.user.firstName} {salary.user.lastName}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {months[salary.month - 1]} {salary.year}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">
                    ₹{salary.netAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-purple-600" />
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Transaction ID, Cheque number, etc."
                />
              </div>

              {/* Send Notification */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendNotification}
                    onChange={(e) => setSendNotification(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Send notification to staff
                    </span>
                  </div>
                </label>
                <p className="text-xs text-gray-500 mt-2 ml-7">
                  Staff will receive a notification that their salary has been
                  paid
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !paymentDate || !paymentMethod}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center"
            >
              {saving ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Mark as Paid
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
