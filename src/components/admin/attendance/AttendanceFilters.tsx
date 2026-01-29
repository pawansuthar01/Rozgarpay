import { Filter, Calendar, Search } from "lucide-react";
import { useDebounce } from "@/lib/hooks";

interface AttendanceFiltersProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  pageLimit: number;
  setPageLimit: (value: number) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOrder: string;
  setSortOrder: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
}

export default function AttendanceFilters({
  statusFilter,
  setStatusFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  pageLimit,
  setPageLimit,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  search,
  setSearch,
}: AttendanceFiltersProps) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Attendance Records
          </h3>
          <Filter className="h-5 w-5 text-gray-400 md:hidden" />
        </div>

        {/* Mobile: Collapsible filters */}
        <div className="md:hidden">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer py-2 text-sm font-medium text-gray-700">
              <span>Filters & Settings</span>
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Search Staff
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Search by name or email..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Start Date"
                      />
                    </div>
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="End Date"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Per Page
                    </label>
                    <select
                      value={pageLimit}
                      onChange={(e) => setPageLimit(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="attendanceDate">Date</option>
                      <option value="status">Status</option>
                      <option value="createdAt">Created</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Order
                    </label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="desc">Newest</option>
                      <option value="asc">Oldest</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Desktop: Inline filters */}
        <div className="hidden md:flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-64"
              placeholder="Search staff by name or phone..."
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Start Date"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="End Date"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
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
            <option value="attendanceDate">Sort by Date</option>
            <option value="status">Sort by Status</option>
            <option value="createdAt">Sort by Created</option>
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
    </div>
  );
}
