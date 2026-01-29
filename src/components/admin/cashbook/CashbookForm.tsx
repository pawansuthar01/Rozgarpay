import { useState } from "react";
import { X, Save } from "lucide-react";
import { CreateCashbookEntryRequest } from "@/types/cashbook";

interface CashbookFormProps {
  onSubmit: (data: CreateCashbookEntryRequest) => void;
  onCancel: () => void;
  preSelectedUserId?: string;
  preSelectedUserName?: string;
  editEntry?: any; // For editing existing entries
  isSubmitting?: boolean;
}

export default function CashbookForm({
  onSubmit,
  onCancel,
  preSelectedUserId,
  preSelectedUserName,
  editEntry,
  isSubmitting = false,
}: CashbookFormProps) {
  const isEditing = !!editEntry;

  const [formData, setFormData] = useState<CreateCashbookEntryRequest>({
    transactionType: editEntry?.transactionType || "EXPENSE",
    direction: editEntry?.direction || "DEBIT",
    amount: editEntry?.amount || 0,
    description: editEntry?.description || "",
    userId: preSelectedUserId || editEntry?.userId,
    paymentMode: editEntry?.paymentMode,
    reference: editEntry?.reference,
    notes: editEntry?.notes,
    transactionDate: editEntry?.transactionDate
      ? new Date(editEntry.transactionDate).toISOString().split("T")[0]
      : undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const transactionTypes = [
    { value: "SALARY_PAYMENT", label: "Salary Payment" },
    { value: "ADVANCE", label: "Advance" },
    { value: "RECOVERY", label: "Recovery" },
    { value: "VENDOR_PAYMENT", label: "Vendor Payment" },
    { value: "CLIENT_PAYMENT", label: "Client Payment" },
    { value: "EXPENSE", label: "Expense" },
    { value: "ADJUSTMENT", label: "Adjustment" },
  ];

  const directions = [
    { value: "CREDIT", label: "Credit (Company receives money)" },
    { value: "DEBIT", label: "Debit (Company gives money)" },
  ];

  const paymentModes = [
    { value: "", label: "Select Payment Mode" },
    { value: "CASH", label: "Cash" },
    { value: "BANK", label: "Bank Transfer" },
    { value: "UPI", label: "UPI" },
    { value: "CHEQUE", label: "Cheque" },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.transactionType) {
      newErrors.transactionType = "Transaction type is required";
    }

    if (!formData.direction) {
      newErrors.direction = "Direction is required";
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clean up the data
    const submitData = {
      ...formData,
      amount: Number(formData.amount),
      description: formData.description.trim(),
      notes: formData.notes?.trim() || undefined,
      paymentMode: (formData.paymentMode as any) || undefined,
      reference: formData.reference?.trim() || undefined,
    };
    onSubmit(submitData);
  };

  const handleChange = (
    field: keyof CreateCashbookEntryRequest,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-opacity-50">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-6 text-center sm:block sm:p-0 sm:items-center">
        {/* Modal panel - Mobile-first: slides up from bottom */}
        <div className="w-full max-w-lg mx-auto bg-white rounded-t-2xl sm:rounded-xl shadow-2xl transform transition-all sm:relative">
          <form onSubmit={handleSubmit}>
            <div className="px-6 pt-6 pb-6 sm:p-6 sm:pb-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditing ? "Edit Transaction" : "Add Transaction"}
                </h3>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Pre-selected User Display */}
                {preSelectedUserId && preSelectedUserName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-base font-medium text-blue-600">
                          {preSelectedUserName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-medium text-blue-900">
                          Transaction for: {preSelectedUserName}
                        </p>
                        <p className="text-sm text-blue-600">
                          This transaction will be associated with this user
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction Type & Direction - Side by side on larger screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      value={formData.transactionType}
                      onChange={(e) =>
                        handleChange("transactionType", e.target.value)
                      }
                      className={`w-full px-4 py-4 text-base border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
                        errors.transactionType
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                    >
                      {transactionTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {errors.transactionType && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.transactionType}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Direction *
                    </label>
                    <select
                      value={formData.direction}
                      onChange={(e) =>
                        handleChange("direction", e.target.value)
                      }
                      className={`w-full px-4 py-4 text-base border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
                        errors.direction ? "border-red-300" : "border-gray-300"
                      }`}
                    >
                      {directions.map((dir) => (
                        <option key={dir.value} value={dir.value}>
                          {dir.label}
                        </option>
                      ))}
                    </select>
                    {errors.direction && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.direction}
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount & Payment Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        handleChange("amount", parseFloat(e.target.value) || 0)
                      }
                      className={`w-full px-4 py-4 text-base border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.amount ? "border-red-300" : "border-gray-300"
                      }`}
                      placeholder="0.00"
                    />
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.amount}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Mode
                    </label>
                    <select
                      value={formData.paymentMode || ""}
                      onChange={(e) =>
                        handleChange("paymentMode", e.target.value || undefined)
                      }
                      className="w-full px-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      {paymentModes.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    rows={4}
                    className={`w-full px-4 py-4 text-base border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                      errors.description ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="Enter transaction description"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.reference || ""}
                    onChange={(e) => handleChange("reference", e.target.value)}
                    className="w-full px-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Invoice number, transaction ID, etc."
                  />
                </div>

                {/* Transaction Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={formData.transactionDate || ""}
                    onChange={(e) =>
                      handleChange("transactionDate", e.target.value)
                    }
                    className="w-full px-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Additional notes"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-5 sm:px-6 border-t border-gray-200">
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-4 space-y-reverse sm:space-y-0">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-4 border border-gray-300 shadow-sm text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-4 bg-blue-600 border border-transparent rounded-xl font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      {isEditing ? "Update Transaction" : "Save Transaction"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
