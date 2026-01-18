import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { AttendanceStats } from "@/types/attendance";

interface AttendanceStatsCardsProps {
  stats: AttendanceStats | null;
  loading: boolean;
}

export default function AttendanceStatsCards({
  stats,
  loading,
}: AttendanceStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 md:p-6 rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm font-medium text-blue-700 mb-1">
              Total Records
            </p>
            {loading ? (
              <Skeleton height={28} width={40} />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-blue-900">
                {stats?.totalRecords || 0}
              </p>
            )}
          </div>
          <div className="bg-blue-200 p-2 md:p-3 rounded-lg">
            <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-700" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 md:p-6 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm font-medium text-green-700 mb-1">
              Approved
            </p>
            {loading ? (
              <Skeleton height={28} width={40} />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-green-900">
                {stats?.approved || 0}
              </p>
            )}
          </div>
          <div className="bg-green-200 p-2 md:p-3 rounded-lg">
            <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-700" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 md:p-6 rounded-xl shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm font-medium text-yellow-700 mb-1">
              Pending
            </p>
            {loading ? (
              <Skeleton height={28} width={40} />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-yellow-900">
                {stats?.pending || 0}
              </p>
            )}
          </div>
          <div className="bg-yellow-200 p-2 md:p-3 rounded-lg">
            <Clock className="h-5 w-5 md:h-6 md:w-6 text-yellow-700" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 md:p-6 rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm font-medium text-red-700 mb-1">
              Rejected
            </p>
            {loading ? (
              <Skeleton height={28} width={40} />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-red-900">
                {stats?.rejected || 0}
              </p>
            )}
          </div>
          <div className="bg-red-200 p-2 md:p-3 rounded-lg">
            <XCircle className="h-5 w-5 md:h-6 md:w-6 text-red-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
