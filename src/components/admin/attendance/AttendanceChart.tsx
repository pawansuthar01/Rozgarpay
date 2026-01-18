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
import { AttendanceStats, AttendanceTrend } from "@/types/attendance";

interface AttendanceChartProps {
  statusDistribution: { name: string; value: number; color: string }[];
  dailyTrends: AttendanceTrend[];
  loading: boolean;
}

export default function AttendanceChart({
  statusDistribution,
  dailyTrends,
  loading,
}: AttendanceChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Status Distribution
          </h3>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            Overview
          </div>
        </div>
        {loading ? (
          <Skeleton height={250} className="rounded-lg" />
        ) : (
          <div className="h-56 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "10px" }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Daily Attendance Trends
          </h3>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            Last 7 days
          </div>
        </div>
        {loading ? (
          <Skeleton height={250} className="rounded-lg" />
        ) : (
          <div className="h-56 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyTrends}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  name="Records"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
