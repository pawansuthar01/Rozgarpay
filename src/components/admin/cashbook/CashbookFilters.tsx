import { Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CashbookFiltersProps {
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  transactionType: string;
  setTransactionType: (value: string) => void;
  direction: string;
  setDirection: (value: string) => void;
  paymentMode: string;
  setPaymentMode: (value: string) => void;
  pageLimit: number;
  setPageLimit: (value: number) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOrder: string;
  setSortOrder: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  userRole: string;
}

export default function CashbookFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  transactionType,
  setTransactionType,
  direction,
  setDirection,
  paymentMode,
  setPaymentMode,
  pageLimit,
  setPageLimit,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  search,
  setSearch,
  userRole,
}: CashbookFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const canFilterByUser = ["ADMIN", "MANAGER"].includes(userRole);

  const transactionTypes = [
    { value: "", label: "All Types" },
    { value: "SALARY_PAYMENT", label: "Salary Payment" },
    { value: "ADVANCE", label: "Advance" },
    { value: "RECOVERY", label: "Recovery" },
    { value: "VENDOR_PAYMENT", label: "Vendor Payment" },
    { value: "CLIENT_PAYMENT", label: "Client Payment" },
    { value: "EXPENSE", label: "Expense" },
    { value: "ADJUSTMENT", label: "Adjustment" },
  ];

  const directions = [
    { value: "", label: "All Directions" },
    { value: "CREDIT", label: "Credit" },
    { value: "DEBIT", label: "Debit" },
  ];

  const paymentModes = [
    { value: "", label: "All Modes" },
    { value: "CASH", label: "Cash" },
    { value: "BANK", label: "Bank" },
    { value: "UPI", label: "UPI" },
    { value: "CHEQUE", label: "Cheque" },
  ];

  const sortOptions = [
    { value: "transactionDate", label: "Date" },
    { value: "amount", label: "Amount" },
    { value: "createdAt", label: "Created" },
  ];

  const limitOptions = [10, 25, 50, 100];

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setTransactionType("");
    setDirection("");
    setPaymentMode("");
    setSearch("");
  };

  const hasActiveFilters =
    startDate ||
    endDate ||
    transactionType ||
    direction ||
    paymentMode ||
    search;

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center space-x-2 px-4 py-3 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
            >
              <X className="h-4 w-4" />
              <span>Clear</span>
            </button>
          )}
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className=" flex items-center justify-center space-x-2 px-4 py-3 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Filters - Hidden on mobile by default */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${showFilters ? "block" : "hidden grid"}`}
      >
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {transactionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Direction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Direction
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {directions.map((dir) => (
              <option key={dir.value} value={dir.value}>
                {dir.label}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Mode
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {paymentModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>

        {/* Page Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Per Page
          </label>
          <select
            value={pageLimit}
            onChange={(e) => setPageLimit(Number(e.target.value))}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {limitOptions.map((limit) => (
              <option key={limit} value={limit}>
                {limit}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
