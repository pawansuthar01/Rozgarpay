"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { XCircle, CheckCircle, Eye, Download } from "lucide-react";
import SalaryStatsCards from "@/components/admin/salary/SalaryStatsCards";
import SalaryChart from "@/components/admin/salary/SalaryChart";
import SalaryFilters from "@/components/admin/salary/SalaryFilters";
import SalaryTable from "@/components/admin/salary/SalaryTable";
import { SalaryStats } from "@/types/salary";
import { SalaryRecord } from "@/hooks";

export default function ManagerSalaryPage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [stats, setStats] = useState<SalaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [monthlyTotals, setMonthlyTotals] = useState<
    { month: string; amount: number }[]
  >([]);

  // Filters
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(new Date().getFullYear());
  const [status, setStatus] = useState<string>("");
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchSalaries();
  }, [currentPage, month, year, status, pageLimit, sortBy, sortOrder]);

  const fetchSalaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageLimit.toString(),
        sortBy,
        sortOrder,
      });

      if (month) params.set("month", month.toString());
      if (year) params.set("year", year.toString());
      if (status) params.set("status", status);

      const res = await fetch(`/api/manager/salary?${params}`);
      const data = await res.json();

      if (res.ok) {
        setRecords(data.records || []);
        setStats(data.stats);
        setTotalPages(data.pagination?.totalPages || 1);
        setStatusDistribution(data.charts?.statusDistribution || []);
        setMonthlyTotals(data.charts?.monthlyTotals || []);
      } else {
        setError(data.error || "Failed to fetch salaries");
        setRecords([]);
        setTotalPages(1);
        setStatusDistribution([]);
        setMonthlyTotals([]);
      }
    } catch (error) {
      console.error("Failed to fetch salaries:", error);
      setError("Failed to fetch salaries");
      setRecords([]);
      setTotalPages(1);
      setStatusDistribution([]);
      setMonthlyTotals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (salaryId: string) => {
    try {
      const res = await fetch(`/api/manager/salary/${salaryId}/approve`, {
        method: "POST",
      });

      if (res.ok) {
        fetchSalaries(); // Refresh data
      } else {
        alert("Failed to approve salary");
      }
    } catch (error) {
      console.error("Approve error:", error);
      alert("Failed to approve salary");
    }
  };

  const handleReject = async (salaryId: string, reason: string) => {
    try {
      const res = await fetch(`/api/manager/salary/${salaryId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        fetchSalaries(); // Refresh data
      } else {
        alert("Failed to reject salary");
      }
    } catch (error) {
      console.error("Reject error:", error);
      alert("Failed to reject salary");
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
    try {
      const res = await fetch(`/api/manager/salary/${salaryId}/mark-paid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: paymentData.date,
          method: paymentData.method,
          reference: paymentData.reference,
          sendNotification: paymentData.sendNotification ?? true,
        }),
      });

      if (res.ok) {
        fetchSalaries(); // Refresh data
      } else {
        alert("Failed to mark salary as paid");
      }
    } catch (error) {
      console.error("Mark as paid error:", error);
      alert("Failed to mark salary as paid");
    }
  };

  if (!session || session.user.role !== "MANAGER") {
    return <Loading />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            💰 Team Salary Management
          </h1>
          <p className="mt-2 text-gray-600">Approve and manage team salaries</p>
        </div>
      </div>

      <SalaryStatsCards stats={stats} loading={loading} />

      <SalaryChart
        statusDistribution={statusDistribution}
        monthlyTotals={monthlyTotals}
        loading={loading}
      />

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <SalaryFilters
          search=""
          setSearch={() => console.log("wait...")}
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
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
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
          showActions={true}
        />
      </div>
    </div>
  );
}
