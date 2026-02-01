"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  User,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface StaffProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
}

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  pendingDays: number;
  attendanceRate: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  punchIn: string;
  punchOut: string | null;
  status: string;
  approvedBy: string | null;
}

interface SalaryInfo {
  id: string;
  month: number;
  year: number;
  grossAmount: number;
  netAmount: number;
  status: string;
  paidAt: string | null;
}

export default function StaffProfile() {
  const { data: session } = useSession();
  const params = useParams();
  const staffId = params.staffId as string;

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>(
    [],
  );
  const [salaryInfo, setSalaryInfo] = useState<SalaryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendancePage, setAttendancePage] = useState(1);
  const [salaryPage, setSalaryPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (staffId) {
      fetchStaffData();
    }
  }, [staffId, attendancePage, salaryPage]);

  const fetchStaffData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/manager/staff/${staffId}`),
      fetch(
        `/api/manager/staff/${staffId}/attendance?page=${attendancePage}&limit=${itemsPerPage}`,
      ),
      fetch(
        `/api/manager/staff/${staffId}/salary?page=${salaryPage}&limit=${itemsPerPage}`,
      ),
    ])
      .then(async ([profileRes, attendanceRes, salaryRes]) => {
        const [profileData, attendanceData, salaryData] = await Promise.all([
          profileRes.json(),
          attendanceRes.json(),
          salaryRes.json(),
        ]);

        setProfile(profileData.profile);
        setAttendanceSummary(profileData.attendanceSummary);
        setRecentAttendance(attendanceData.records);
        setSalaryInfo(salaryData.records);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  if (!session || session.user.role !== "MANAGER") {
    return <Loading />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "PENDING":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Staff Profile
          </h1>
          <p className="mt-2 text-gray-600">
            View staff details, attendance, and salary information.
          </p>
        </div>
      </div>

      {/* Staff Profile */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Profile Information
        </h2>
        {loading ? (
          <div className="space-y-4">
            <Skeleton height={20} width={200} />
            <Skeleton height={16} width={150} />
            <Skeleton height={16} width={120} />
            <Skeleton height={16} width={180} />
          </div>
        ) : profile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Name</p>
              <p className="text-lg font-semibold text-gray-900">
                {profile.firstName} {profile.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Email</p>
              <p className="text-gray-900">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Phone</p>
              <p className="text-gray-900">{profile.phone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Role</p>
              <p className="text-gray-900">{profile.role}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-gray-900">{profile.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Joined</p>
              <p className="text-gray-900">
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Staff not found</p>
        )}
      </div>

      {/* Attendance Summary */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Monthly Attendance Summary
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton height={24} width={60} className="mx-auto" />
                <Skeleton height={16} width={80} className="mt-2" />
              </div>
            ))}
          </div>
        ) : attendanceSummary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {attendanceSummary.totalDays}
              </p>
              <p className="text-sm text-gray-600">Total Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {attendanceSummary.presentDays}
              </p>
              <p className="text-sm text-gray-600">Present</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {attendanceSummary.absentDays}
              </p>
              <p className="text-sm text-gray-600">Absent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {Math.round(attendanceSummary.attendanceRate * 100)}%
              </p>
              <p className="text-sm text-gray-600">Attendance Rate</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No attendance data available</p>
        )}
      </div>

      {/* Recent Attendance Records */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Recent Attendance Records
        </h2>
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-4">
                    <Skeleton circle height={32} width={32} />
                    <div>
                      <Skeleton height={16} width={100} />
                      <Skeleton height={12} width={80} />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton height={16} width={60} />
                    <Skeleton height={12} width={40} />
                  </div>
                </div>
              ))
            : recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(record.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        Punch In:{" "}
                        {new Date(record.punchIn).toLocaleTimeString()}
                      </p>
                      {record.punchOut && (
                        <p className="text-xs text-gray-600">
                          Punch Out:{" "}
                          {new Date(record.punchOut).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        record.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : record.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
        </div>
        {recentAttendance.length === itemsPerPage && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setAttendancePage(attendancePage + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Salary Information */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Salary Information
        </h2>
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded"
                >
                  <div>
                    <Skeleton height={16} width={100} />
                    <Skeleton height={12} width={80} />
                  </div>
                  <div className="text-right">
                    <Skeleton height={16} width={60} />
                    <Skeleton height={12} width={40} />
                  </div>
                </div>
              ))
            : salaryInfo.map((salary) => (
                <div
                  key={salary.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(
                        salary.year,
                        salary.month - 1,
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </p>
                    <p className="text-xs text-gray-600">
                      Status: {salary.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₹{salary.netAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {salary.paidAt
                        ? `Paid on ${new Date(salary.paidAt).toLocaleDateString()}`
                        : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
        </div>
        {salaryInfo.length === itemsPerPage && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setSalaryPage(salaryPage + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
