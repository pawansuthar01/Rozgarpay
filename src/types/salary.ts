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

export interface SalaryRecord {
  id: string;
  userId: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    phone: string;
    email: string;
  };
  month: number;
  year: number;
  basicSalary: number;
  da: number;
  hra: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  totalWorkingDays?: number;
  approvedDays?: number;
  grossAmount?: number;
  netAmount?: number;
  pdfUrl?: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}
