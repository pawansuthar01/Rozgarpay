import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Skeleton from "react-loading-skeleton";
import { SalaryDistribution } from "@/types/staff";

interface SalaryChartProps {
  salaryDistribution: SalaryDistribution;
  loading: boolean;
}

export default function SalaryChart({
  salaryDistribution,
  loading,
}: SalaryChartProps) {
  const data = [
    { name: "Paid", value: salaryDistribution.paid, color: "#10B981" },
    { name: "Pending", value: salaryDistribution.pending, color: "#F59E0B" },
    {
      name: "Processing",
      value: salaryDistribution.processing,
      color: "#3B82F6",
    },
  ];

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Salary Distribution (Current Month)
      </h3>
      {loading ? (
        <Skeleton height={300} />
      ) : (
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
