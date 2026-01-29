export interface SalaryRecord {
  id: string;
  userId: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  month: number;
  year: number;
  pdfUrl?: string;
  totalDays: number;
  approvedDays: number;
  grossAmount: number;
  netAmount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
}

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
