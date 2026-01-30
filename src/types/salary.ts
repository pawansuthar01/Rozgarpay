import { SalaryRecord } from "@/hooks";

export interface SalaryStats {
  totalRecords: number;
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  totalAmount: number;
}

export interface SalaryApiResponse {
  records: SalaryRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: SalaryStats;
  charts: {
    statusDistribution: { name: string; value: number; color: string }[];
    monthlyTotals: { month: string; amount: number }[];
  };
}
