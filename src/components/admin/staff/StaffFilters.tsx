import { Filter, Search } from "lucide-react";

interface StaffFiltersProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  attendanceFilter: string;
  setAttendanceFilter: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export default function StaffFilters({
  statusFilter,
  setStatusFilter,
  attendanceFilter,
  setAttendanceFilter,
  searchTerm,
  setSearchTerm,
}: StaffFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-gray-900">Staff List</h3>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-64"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
        <select
          value={attendanceFilter}
          onChange={(e) => setAttendanceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Attendance</option>
          <option value="APPROVED">Present Today</option>
          <option value="PENDING">Pending Today</option>
          <option value="REJECTED">Rejected Today</option>
          <option value="NOT_MARKED">Not Marked Today</option>
        </select>
      </div>
    </div>
  );
}
