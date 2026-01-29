import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  FileText,
  Clock,
  CheckCircle,
  DollarSign,
  XCircle,
} from "lucide-react";
import { SalaryStats } from "@/types/salary";
import { formatCurrency } from "@/lib/utils";

interface SalaryStatsCardsProps {
  stats: SalaryStats | null;
  loading: boolean;
}

export default function SalaryStatsCards({
  stats,
  loading,
}: SalaryStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Records</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-sm md:text-xl font-bold text-gray-900">
                {stats?.totalRecords || 0}
              </p>
            )}
          </div>
          <FileText className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pending</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-sm md:text-xl font-bold text-yellow-600">
                {stats?.pending || 0}
              </p>
            )}
          </div>
          <Clock className="h-6 w-6 text-yellow-600" />
        </div>
      </div>

      <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Approved</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-sm md:text-xl  font-bold text-blue-600">
                {stats?.approved || 0}
              </p>
            )}
          </div>
          <CheckCircle className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Paid</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-sm md:text-xl  font-bold text-green-600">
                {stats?.paid || 0}
              </p>
            )}
          </div>
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Rejected</p>
            {loading ? (
              <Skeleton height={36} width={50} />
            ) : (
              <p className="text-sm md:text-xl font-bold text-red-600">
                {stats?.rejected || 0}
              </p>
            )}
          </div>
          <XCircle className="h-6 w-6 text-red-600" />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Amount</p>
            {loading ? (
              <Skeleton height={36} width={80} />
            ) : (
              <p className="text-sm flex md:text-xl  font-bold text-purple-600">
                ₹{formatCurrency(stats?.totalAmount || 0)}
              </p>
            )}
          </div>
          <DollarSign className="h-6 w-6 text-purple-600" />
        </div>
      </div>
    </div>
  );
}
