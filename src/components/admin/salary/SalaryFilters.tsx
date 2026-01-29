import { Filter, Calendar, Search } from "lucide-react";

interface SalaryFiltersProps {
  month: number | null;
  setMonth: (value: number | null) => void;
  year: number | null;
  setYear: (value: number | null) => void;
  status: string;
  setStatus: (value: string) => void;
  pageLimit: number;
  setPageLimit: (value: number) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOrder: string;
  setSortOrder: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
}

export default function SalaryFilters({
  month,
  setMonth,
  year,
  setYear,
  status,
  setStatus,
  pageLimit,
  setPageLimit,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  search,
  setSearch,
}: SalaryFiltersProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Salary Records</h3>
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Search staff by name or email..."
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
        <select
          value={month || ""}
          onChange={(e) =>
            setMonth(e.target.value ? parseInt(e.target.value) : null)
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Months</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={year || ""}
          onChange={(e) =>
            setYear(e.target.value ? parseInt(e.target.value) : null)
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Status</option>
          <option value="GENERATED">Generated</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
        </select>
        <select
          value={pageLimit}
          onChange={(e) => setPageLimit(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="createdAt">Sort by Created</option>
          <option value="netAmount">Sort by Amount</option>
          <option value="status">Sort by Status</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  );
}
