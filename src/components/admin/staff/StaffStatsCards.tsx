import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Users, CheckCircle, Clock, UserCheck } from "lucide-react";
import { StaffStats } from "@/types/staff";

interface StaffStatsCardsProps {
  stats: StaffStats | null;
  loading: boolean;
}

export default function StaffStatsCards({
  stats,
  loading,
}: StaffStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Staff</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {stats?.totalStaff || 0}
              </p>
            )}
          </div>
          <Users className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Present Today</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-3xl font-bold text-green-600">
                {stats?.todayPresent || 0}
              </p>
            )}
          </div>
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">
              Pending Approval
            </p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-3xl font-bold text-yellow-600">
                {stats?.todayPending || 0}
              </p>
            )}
          </div>
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-3xl font-bold text-blue-600">
                {stats?.todayAttendanceRate || 0}%
              </p>
            )}
          </div>
          <UserCheck className="h-8 w-8 text-blue-600" />
        </div>
      </div>
    </div>
  );
}
