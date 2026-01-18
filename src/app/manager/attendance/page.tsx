"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  Filter,
  Search,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  attendanceDate: string;
  punchIn: string;
  punchOut: string | null;
  status: string;
  imageUrl: string | null;
}

export default function ManagerAttendance() {
  const { data: session } = useSession();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAttendance();
  }, [currentPage, dateFilter, statusFilter, search]);

  const fetchAttendance = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
      date: dateFilter,
      status: statusFilter,
      search,
    });

    fetch(`/api/manager/attendance?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setAttendance(data.records);
        setTotalPages(data.totalPages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (response.ok) {
        fetchAttendance(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to approve attendance:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await fetch(`/api/attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });

      if (response.ok) {
        fetchAttendance(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to reject attendance:", error);
    }
  };

  if (!session || session.user.role !== "MANAGER") {
    return <div>Access Denied</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Attendance Management
          </h1>
          <p className="mt-2 text-gray-600">
            Review and manage attendance records for your team.
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
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-medium text-gray-700 text-sm">
          <div>Staff</div>
          <div>Date</div>
          <div>Punch Times</div>
          <div>Status</div>
          <div>Image</div>
          <div>Actions</div>
        </div>

        {/* Attendance Items */}
        <div className="divide-y divide-gray-200">
          {loading
            ? Array.from({ length: itemsPerPage }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="flex flex-col md:grid md:grid-cols-6 md:gap-4 md:items-center">
                    <div className="mb-2 md:mb-0">
                      <Skeleton height={16} width={120} />
                      <Skeleton height={12} width={150} className="mt-1" />
                    </div>
                    <div className="mb-2 md:mb-0">
                      <Skeleton height={16} width={80} />
                    </div>
                    <div className="mb-2 md:mb-0">
                      <Skeleton height={12} width={100} />
                      <Skeleton height={12} width={100} className="mt-1" />
                    </div>
                    <div className="mb-2 md:mb-0">
                      <Skeleton height={24} width={80} />
                    </div>
                    <div className="mb-2 md:mb-0">
                      <Skeleton height={32} width={60} />
                    </div>
                    <div>
                      <div className="flex space-x-2">
                        <Skeleton height={32} width={60} />
                        <Skeleton height={32} width={60} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            : attendance?.map((record) => (
                <div key={record.id} className="p-4 hover:bg-gray-50">
                  <div className="flex flex-col md:grid md:grid-cols-6 md:gap-4 md:items-center">
                    {/* Staff */}
                    <div className="mb-2 md:mb-0">
                      <div className="font-medium text-gray-900">
                        {record.userName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.userEmail}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="mb-2 md:mb-0">
                      <span className="text-sm text-gray-900">
                        {new Date(record.attendanceDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Punch Times */}
                    <div className="mb-2 md:mb-0">
                      <div className="text-sm text-gray-900">
                        In: {new Date(record.punchIn).toLocaleTimeString()}
                      </div>
                      {record.punchOut && (
                        <div className="text-sm text-gray-600">
                          Out: {new Date(record.punchOut).toLocaleTimeString()}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="mb-2 md:mb-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}
                      >
                        {getStatusIcon(record.status)}
                        <span className="ml-1">{record.status}</span>
                      </span>
                    </div>

                    {/* Image */}
                    <div className="mb-2 md:mb-0">
                      {record.imageUrl ? (
                        <button
                          onClick={() => setSelectedImage(record.imageUrl)}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">No image</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div>
                      {record.status === "PENDING" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(record.id)}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(record.id)}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </button>
                        </div>
                      )}
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

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative max-w-2xl max-h-screen p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="Attendance proof"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
