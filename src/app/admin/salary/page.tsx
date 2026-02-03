"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { XCircle, DollarSign, Filter, IndianRupee } from "lucide-react";
import SalaryStatsCards from "@/components/admin/salary/SalaryStatsCards";
import SalaryFilters from "@/components/admin/salary/SalaryFilters";
import SalaryTable from "@/components/admin/salary/SalaryTable";
import { useDebounce } from "@/lib/hooks";
import {
  useSalaries,
  useApproveSalary,
  useRejectSalary,
  useMarkSalaryPaid,
  useRecalculateSalary,
} from "@/hooks/useSalary";
import { useModal } from "@/components/ModalProvider";

export default function AdminSalaryPage() {
  const { data: session } = useSession();
  const { showMessage } = useModal();

  // Filters
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(new Date().getFullYear());
  const [status, setStatus] = useState<string>("");
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 500);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Use the salaries query
  const {
    data: salariesData,
    isLoading: loading,
    error,
  } = useSalaries({
    page: currentPage,
    limit: pageLimit,
    month: month || undefined,
    year: year || undefined,
    status: status || undefined,
    sortBy,
    sortOrder,
    search: debouncedSearch || undefined,
  });

  const records = salariesData?.records || [];
  const stats = salariesData?.stats || null;
  const totalPages = salariesData?.pagination?.totalPages || 1;

  // Mutations
  const approveMutation = useApproveSalary();
  const rejectMutation = useRejectSalary();
  const markPaidMutation = useMarkSalaryPaid();
  const recalculateMutation = useRecalculateSalary();

  // Loading states for actions
  const [approveLoading, setApproveLoading] = useState<string | null>(null);
  const [rejectLoading, setRejectLoading] = useState<string | null>(null);
  const [markPaidLoading, setMarkPaidLoading] = useState<string | null>(null);
  const [recalculateLoading, setRecalculateLoading] = useState<string | null>(
    null,
  );

  const handleApprove = async (salaryId: string) => {
    setApproveLoading(salaryId);
    try {
      await approveMutation.mutateAsync(salaryId, {
        onError: (error) => {
          showMessage(
            "error",
            "Error",
            error.message || "Failed to recover payment",
          );
        },
        onSuccess: () => {
          showMessage("success", "Success", "Salary approved successfully");
        },
      });
    } catch (error: any) {
      showMessage(
        "error",
        "Error",
        error.error || error.message || "Failed to approve salary",
      );
    } finally {
      setApproveLoading(null);
    }
  };

  const handleReject = async (salaryId: string, reason: string) => {
    setRejectLoading(salaryId);
    try {
      await rejectMutation.mutateAsync(salaryId, {
        onError: (error) => {
          showMessage(
            "error",
            "Error",
            error.message || "Failed to recover payment",
          );
        },
        onSuccess: () => {
          showMessage("success", "Success", "Salary approved successfully");
        },
      });
      showMessage("success", "Success", "Salary rejected successfully");
    } catch (error: any) {
      showMessage(
        "error",
        "Error",
        error.error || error.message || "Failed to reject salary",
      );
    } finally {
      setRejectLoading(null);
    }
  };
  const handleMarkAsPaid = async (
    salaryId: string,
    paymentData: {
      date: string;
      method: string;
      reference?: string;
      sendNotification?: boolean;
    },
  ) => {
    setMarkPaidLoading(salaryId);
    try {
      await markPaidMutation.mutateAsync(
        { salaryId, paymentData },
        {
          onError: (error) => {
            showMessage(
              "error",
              "Error",
              error.message || "Failed to recover payment",
            );
          },
          onSuccess: () => {
            showMessage(
              "success",
              "Success",
              "Salary marked as paid successfully",
            );
          },
        },
      );
    } catch (error: any) {
      showMessage(
        "error",
        "Error",
        error.message || error.error || "Failed to mark salary as paid",
      );
    } finally {
      setMarkPaidLoading(null);
    }
  };

  const handleRecalculate = async (salaryId: string) => {
    setRecalculateLoading(salaryId);
    try {
      await recalculateMutation.mutateAsync(salaryId);
      showMessage("success", "Success", "Salary recalculated successfully");
    } catch (error) {
      console.error("Recalculate error:", error);
      showMessage("error", "Error", "Failed to recalculate salary");
    } finally {
      setRecalculateLoading(null);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto  sm:px-6 lg:px-8 py-2 sm:py-6">
        {/* Header */}
        <div className=" mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
            <div>
              <h1 className="text-2xl flex items-center  md:text-3xl font-bold text-gray-900">
                <IndianRupee /> Payroll Management
              </h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">
                Manage and process monthly salary records
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6">
          <SalaryStatsCards stats={stats} loading={loading} />
        </div>

        {/* Salary Records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6">
            <div className="mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </button>
              {showFilters && (
                <div className="mt-4">
                  <SalaryFilters
                    month={month}
                    setMonth={setMonth}
                    year={year}
                    setYear={setYear}
                    status={status}
                    setStatus={setStatus}
                    pageLimit={pageLimit}
                    setPageLimit={setPageLimit}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    search={search}
                    setSearch={setSearch}
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {error.message || "Failed to fetch salaries"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <SalaryTable
              records={records}
              loading={loading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={pageLimit}
              onApprove={handleApprove}
              onReject={handleReject}
              onMarkAsPaid={handleMarkAsPaid}
              onRecalculate={handleRecalculate}
              loadingIds={{
                approve: approveLoading,
                reject: rejectLoading,
                markPaid: markPaidLoading,
                recalculate: recalculateLoading,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
