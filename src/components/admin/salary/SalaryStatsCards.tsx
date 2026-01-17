import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { FileText, Clock, CheckCircle, DollarSign } from "lucide-react";
import { SalaryStats } from "@/types/salary";

interface SalaryStatsCardsProps {
  stats: SalaryStats | null;
  loading: boolean;
}

export default function SalaryStatsCards({
  stats,
  loading,
}: SalaryStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Records</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {stats?.totalRecords || 0}
              </p>
            )}
          </div>
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Generated</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-3xl font-bold text-blue-600">
                {stats?.generated || 0}
              </p>
            )}
          </div>
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pending</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-3xl font-bold text-yellow-600">
                {stats?.pending || 0}
              </p>
            )}
          </div>
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Paid</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-3xl font-bold text-green-600">
                {stats?.paid || 0}
              </p>
            )}
          </div>
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Amount</p>
            {loading ? (
              <Skeleton height={36} width={80} />
            ) : (
              <p className="text-3xl font-bold text-purple-600">
                ₹{stats?.totalAmount?.toLocaleString() || 0}
              </p>
            )}
          </div>
          <DollarSign className="h-8 w-8 text-purple-600" />
        </div>
      </div>
    </div>
  );
}
