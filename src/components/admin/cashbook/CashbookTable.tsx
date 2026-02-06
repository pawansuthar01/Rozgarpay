import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import { CashbookEntry } from "@/types/cashbook";

interface CashbookTableProps {
  entries: CashbookEntry[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onReverse?: (entryId: string, reason: string) => void;
  onEdit?: (entry: CashbookEntry) => void;
  onDelete?: (entryId: string) => void;
  userRole: string;
  deletingEntryId?: string | null;
  reversingEntryId?: string | null;
  editingEntryId?: string | null;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function CashbookTable({
  entries,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onReverse,
  onEdit,
  onDelete,
  userRole,
  deletingEntryId = null,
  reversingEntryId = null,
  editingEntryId = null,
  showConfirm,
}: CashbookTableProps) {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  const formatDate = (dateString: string) => {
    // Convert UTC date to Indian timezone (Asia/Kolkata, UTC+5:30)
    const date = new Date(dateString);
    // Add 5 hours and 30 minutes to convert UTC to IST
    const istDate = new Date(
      date.getTime() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000,
    );
    return istDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDirectionColor = (direction: string) => {
    return direction === "CREDIT" ? "text-green-600" : "text-red-600";
  };

  const getDirectionBg = (direction: string) => {
    return direction === "CREDIT" ? "bg-green-50" : "bg-red-50";
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SALARY_PAYMENT: "Salary Payment",
      ADVANCE: "Advance",
      RECOVERY: "Recovery",
      VENDOR_PAYMENT: "Vendor Payment",
      CLIENT_PAYMENT: "Client Payment",
      EXPENSE: "Expense",
      ADJUSTMENT: "Adjustment",
    };
    return labels[type] || type;
  };

  const handleReverse = (entry: CashbookEntry) => {
    if (showConfirm && onReverse) {
      showConfirm(
        "Reverse Transaction",
        `Are you sure you want to reverse this transaction of ₹${entry.amount.toLocaleString()} (${entry.direction})? This will create an opposite entry to cancel it out.`,
        () => {
          // First show a prompt for reason
          const reason = prompt("Enter reason for reversal:");
          if (reason) {
            onReverse(entry.id, reason);
          }
        },
      );
    } else {
      // Fallback to prompt if showConfirm not available
      const reason = prompt("Enter reason for reversal:");
      if (reason && onReverse) {
        onReverse(entry.id, reason);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: itemsPerPage }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="p-4 rounded-lg border bg-white">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-gray-900">{entry.description}</p>
                <p className="text-sm text-gray-600">
                  {getTransactionTypeLabel(entry.transactionType)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-bold text-lg ${getDirectionColor(entry.direction)}`}
                >
                  {entry.direction === "CREDIT" ? "+" : "-"}
                  {formatCurrency(entry.amount)}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    entry.direction === "CREDIT"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {entry.direction}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-medium">Date</p>
                <p>{formatDate(entry.transactionDate)}</p>
              </div>
              <div>
                <p className="font-medium">Payment Mode</p>
                <p>{entry.paymentMode || "N/A"}</p>
              </div>
              {entry.user && (
                <div className="col-span-2">
                  <p className="font-medium">User</p>
                  <p>
                    {entry.user.firstName} {entry.user.lastName} (
                    {entry.user.email})
                  </p>
                </div>
              )}
              {entry.reference && (
                <div className="col-span-2">
                  <p className="font-medium">Reference</p>
                  <p className="text-xs font-mono">{entry.reference}</p>
                </div>
              )}
              {entry.notes && (
                <div className="col-span-2">
                  <p className="font-medium">Notes</p>
                  <p>{entry.notes}</p>
                </div>
              )}
            </div>

            {entry.isReversed && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                This transaction has been reversed
              </div>
            )}

            {((onEdit && ["ADMIN", "MANAGER"].includes(userRole)) ||
              (onDelete && userRole === "ADMIN")) &&
              !entry.isReversed && (
                <div className="mt-2 flex justify-end space-x-3">
                  {onEdit && ["ADMIN", "MANAGER"].includes(userRole) && (
                    <button
                      onClick={() => onEdit(entry)}
                      disabled={[
                        reversingEntryId,
                        deletingEntryId,
                        editingEntryId,
                      ].includes(entry.id)}
                      className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {[
                        reversingEntryId,
                        deletingEntryId,
                        editingEntryId,
                      ].includes(entry.id) ? (
                        <div className="animate-spin h-3 w-3 border border-green-600 border-t-transparent rounded-full"></div>
                      ) : (
                        <Edit className="h-3 w-3" />
                      )}
                      <span>
                        {editingEntryId === entry.id ? "Updating..." : "Edit"}
                      </span>
                    </button>
                  )}
                  {/* Reverse only for non-linked entries */}
                  {onReverse && userRole === "ADMIN" && !entry.reference && (
                    <button
                      onClick={() => handleReverse(entry)}
                      disabled={[reversingEntryId, deletingEntryId].includes(
                        entry.id,
                      )}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {[reversingEntryId, deletingEntryId].includes(
                        entry.id,
                      ) ? (
                        <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      <span>
                        {reversingEntryId === entry.id
                          ? "Reversing..."
                          : "Reverse"}
                      </span>
                    </button>
                  )}
                  {onDelete && userRole === "ADMIN" && (
                    <button
                      onClick={() => onDelete(entry.id)}
                      disabled={[reversingEntryId, deletingEntryId].includes(
                        entry.id,
                      )}
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {[reversingEntryId, deletingEntryId].includes(
                        entry.id,
                      ) ? (
                        <div className="animate-spin h-3 w-3 border border-red-600 border-t-transparent rounded-full"></div>
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      <span>
                        {deletingEntryId === entry.id
                          ? "Deleting..."
                          : "Delete"}
                      </span>
                    </button>
                  )}
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Direction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Mode
              </th>
              {userRole !== "STAFF" && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={entry.isReversed ? "opacity-60" : ""}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(entry.transactionDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getTransactionTypeLabel(entry.transactionType)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    {entry.notes && (
                      <p className="text-gray-500 text-xs mt-1">
                        {entry.notes}
                      </p>
                    )}
                    {entry.reference && (
                      <p className="text-gray-400 text-xs font-mono">
                        {entry.reference}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.direction === "CREDIT"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {entry.direction}
                  </span>
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getDirectionColor(entry.direction)}`}
                >
                  {entry.direction === "CREDIT" ? "+" : "-"}
                  {formatCurrency(entry.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.paymentMode || "N/A"}
                </td>
                {userRole !== "STAFF" && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.user ? (
                      <div>
                        <p className="font-medium">
                          {entry.user.firstName} {entry.user.lastName}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {entry.user.email}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    {entry.isReversed && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        Reversed
                      </span>
                    )}
                    {["ADMIN", "MANAGER"].includes(userRole) &&
                      !entry.isReversed && (
                        <>
                          {onEdit && (
                            <button
                              onClick={() => onEdit(entry)}
                              disabled={[
                                reversingEntryId,
                                deletingEntryId,
                                editingEntryId,
                              ].includes(entry.id)}
                              className="text-green-600 hover:text-green-900 text-sm flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              title={
                                editingEntryId === entry.id
                                  ? "Updating transaction..."
                                  : "Edit transaction"
                              }
                            >
                              {editingEntryId === entry.id ? (
                                <div className="animate-spin h-4 w-4 border border-green-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <Edit className="h-4 w-4" />
                              )}
                              <span>
                                {editingEntryId === entry.id
                                  ? "Updating..."
                                  : "Edit"}
                              </span>
                            </button>
                          )}
                          {/* Reverse only for non-linked entries */}
                          {onReverse &&
                            userRole === "ADMIN" &&
                            !entry.reference && (
                              <button
                                onClick={() => handleReverse(entry)}
                                disabled={[
                                  reversingEntryId,
                                  deletingEntryId,
                                ].includes(entry.id)}
                                className="text-blue-600 hover:text-blue-900 cursor-pointer  disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center space-x-1"
                                title={
                                  reversingEntryId === entry.id
                                    ? "Reversing transaction..."
                                    : "Reverse transaction"
                                }
                              >
                                {reversingEntryId === entry.id ? (
                                  <div className="animate-spin h-4 w-4 border border-blue-600 border-t-transparent rounded-full"></div>
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                                <span>
                                  {reversingEntryId === entry.id
                                    ? "Reversing..."
                                    : "Reverse"}
                                </span>
                              </button>
                            )}
                          {/* Delete for all entries */}
                          {onDelete && userRole === "ADMIN" && (
                            <button
                              onClick={() => onDelete(entry.id)}
                              disabled={[
                                reversingEntryId,
                                deletingEntryId,
                              ].includes(entry.id)}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed text-sm flex items-center space-x-1"
                              title={
                                deletingEntryId === entry.id
                                  ? "Deleting transaction..."
                                  : "Delete transaction"
                              }
                            >
                              {deletingEntryId === entry.id ? (
                                <div className="animate-spin h-4 w-4 border border-red-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              <span>
                                {deletingEntryId === entry.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </span>
                            </button>
                          )}
                        </>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex justify-between flex-1 sm:hidden">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="h-5 w-5 transform rotate-90" />
                </button>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="h-5 w-5 transform rotate-90" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
