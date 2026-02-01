"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useEffect, useState } from "react";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  todayStatus: "PRESENT" | "ABSENT" | "PENDING" | "NOT_PUNCHED";
  lastPunchTime: string | null;
}

export default function ManagerTeam() {
  const { data: session } = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStaff();
  }, [currentPage, search, statusFilter]);

  const fetchStaff = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
      search,
      status: statusFilter,
    });

    fetch(`/api/manager/staff?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setStaff(data.staff);
        setTotalPages(data.totalPages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  if (!session || session.user.role !== "MANAGER") {
    return <Loading />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "ABSENT":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "Present";
      case "ABSENT":
        return "Absent";
      case "PENDING":
        return "Pending";
      default:
        return "Not Punched";
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Team Management
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor your team's attendance and performance.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="PENDING">Pending</option>
            <option value="NOT_PUNCHED">Not Punched</option>
          </select>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-medium text-gray-700">
          <div>Name</div>
          <div>Today Status</div>
          <div>Last Punch Time</div>
          <div>Actions</div>
        </div>

        {/* Staff Items */}
        <div className="divide-y divide-gray-200">
          {loading
            ? Array.from({ length: itemsPerPage }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="flex flex-col md:grid md:grid-cols-4 md:gap-4 md:items-center">
                    <div className="mb-2 md:mb-0">
                      <Skeleton height={20} width={120} />
                      <Skeleton height={16} width={150} className="mt-1" />
                    </div>
                    <div className="mb-2 md:mb-0">
                      <Skeleton height={20} width={80} />
                    </div>
                    <div className="mb-2 md:mb-0">
                      <Skeleton height={16} width={100} />
                    </div>
                    <div>
                      <Skeleton height={32} width={100} />
                    </div>
                  </div>
                </div>
              ))
            : staff.map((member) => (
                <div key={member.id} className="p-4 hover:bg-gray-50">
                  <div className="flex flex-col md:grid md:grid-cols-4 md:gap-4 md:items-center">
                    {/* Name */}
                    <div className="mb-2 md:mb-0">
                      <div className="font-medium text-gray-900">
                        {member.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.email}
                      </div>
                    </div>

                    {/* Today Status */}
                    <div className="mb-2 md:mb-0 flex items-center space-x-2">
                      {getStatusIcon(member.todayStatus)}
                      <span className="text-sm font-medium">
                        {getStatusText(member.todayStatus)}
                      </span>
                    </div>

                    {/* Last Punch Time */}
                    <div className="mb-2 md:mb-0">
                      <span className="text-sm text-gray-600">
                        {member.lastPunchTime
                          ? new Date(member.lastPunchTime).toLocaleString()
                          : "No punches today"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div>
                      <Link
                        href={`/manager/attendance?userId=${member.id}`}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Attendance
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
