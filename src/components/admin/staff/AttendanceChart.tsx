import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import Skeleton from "react-loading-skeleton";
import { StaffStats, AttendanceTrend } from "@/types/staff";

interface AttendanceChartProps {
  stats: StaffStats | null;
  attendanceTrends: AttendanceTrend[];
  loading: boolean;
}

export default function AttendanceChart({
  stats,
  attendanceTrends,
  loading,
}: AttendanceChartProps) {
  const attendanceData = stats
    ? [
        { name: "Present Today", value: stats.todayPresent, color: "#10B981" },
        { name: "Pending Today", value: stats.todayPending, color: "#F59E0B" },
        {
          name: "Absent Today",
          value: stats.totalStaff - stats.todayPresent - stats.todayPending,
          color: "#EF4444",
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Today's Attendance Overview
        </h3>
        {loading ? (
          <Skeleton height={300} />
        ) : (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Attendance Trends (Last 7 Days)
        </h3>
        {loading ? (
          <Skeleton height={300} />
        ) : (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#10B981" name="Present" />
                <Bar dataKey="absent" fill="#EF4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
