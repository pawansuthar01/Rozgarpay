"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  CheckSquare,
} from "lucide-react";

interface ManagerDashboardStats {
  teamSize: number;
  todaysAttendance: {
    present: number;
    absent: number;
    pendingApprovals: number;
  };
  pendingAttendanceApprovals: Array<{
    id: string;
    user: string;
    timestamp: string;
  }>;
  recentTeamActivity: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
  }>;
}

export default function ManagerDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ManagerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats
    fetch("/api/manager/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!session || session.user.role !== "MANAGER") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Manager Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor your team's attendance and activities.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Size</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.teamSize || 0}
                </p>
              )}
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-green-600">
                  {stats?.todaysAttendance.present || 0}
                </p>
              )}
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent Today</p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-red-600">
                  {stats?.todaysAttendance.absent || 0}
                </p>
              )}
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pending Approvals
              </p>
              {loading ? (
                <Skeleton height={36} width={50} />
              ) : (
                <p className="text-3xl font-bold text-yellow-600">
                  {stats?.todaysAttendance.pendingApprovals || 0}
                </p>
              )}
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Pending Attendance Approvals */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pending Attendance Approvals
        </h3>
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-4">
                    <Skeleton circle height={32} width={32} />
                    <div>
                      <Skeleton height={16} width={120} />
                      <Skeleton height={12} width={80} />
                    </div>
                  </div>
                  <Skeleton height={32} width={80} />
                </div>
              ))
            : stats?.pendingAttendanceApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-4">
                    <CheckSquare className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {approval.user}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(approval.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                    Approve
                  </button>
                </div>
              ))}
        </div>
      </div>

      {/* Recent Team Activity */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Team Activity
        </h3>
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded"
                >
                  <Skeleton circle height={32} width={32} />
                  <div className="flex-1">
                    <Skeleton height={16} width="60%" />
                    <Skeleton height={12} width="40%" />
                  </div>
                  <Skeleton height={12} width={80} />
                </div>
              ))
            : stats?.recentTeamActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded"
                >
                  <Activity className="h-8 w-8 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-600">by {activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
