export type CashbookTransactionType =
  | "SALARY_PAYMENT"
  | "ADVANCE"
  | "RECOVERY"
  | "VENDOR_PAYMENT"
  | "CLIENT_PAYMENT"
  | "EXPENSE"
  | "ADJUSTMENT";

export type CashbookDirection = "CREDIT" | "DEBIT";

export type PaymentMode = "CASH" | "BANK" | "UPI" | "CHEQUE";

export interface CashbookEntry {
  id: string;
  companyId: string;
  userId?: string;
  transactionType: CashbookTransactionType;
  direction: CashbookDirection;
  amount: number;
  paymentMode?: PaymentMode;
  reference?: string;
  description: string;
  notes?: string;
  transactionDate: string;
  createdBy: string;
  reversalOf?: string;
  isReversed: boolean;
  createdAt: string;
  // Relations
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string;
  };
  creator: {
    firstName: string | null;
    lastName: string | null;
    phone: string;
  };
}

export interface CashbookFilters {
  startDate?: string;
  endDate?: string;
  transactionType?: CashbookTransactionType;
  direction?: CashbookDirection;
  userId?: string;
  paymentMode?: PaymentMode;
  search?: string;
}

export interface CashbookStats {
  currentBalance: number;
  totalCredit: number;
  totalDebit: number;
  monthlyCredit: number;
  monthlyDebit: number;
  transactionCount: number;
}

export interface CashbookBalance {
  currentBalance: number;
  openingBalance: number;
  closingBalance: number;
  staffBalance?: number; // For individual staff view
}

export interface CashbookApiResponse {
  entries: CashbookEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: CashbookStats;
  balance: CashbookBalance;
  filters: CashbookFilters;
}

export interface CreateCashbookEntryRequest {
  transactionType: CashbookTransactionType;
  direction: CashbookDirection;
  amount: number;
  paymentMode?: PaymentMode;
  reference?: string;
  description: string;
  notes?: string;
  transactionDate?: string;
  userId?: string; // For transactions related to specific staff
}

export interface ReverseCashbookEntryRequest {
  reason: string;
  notes?: string;
}

export interface CashbookReportData {
  entries: CashbookEntry[];
  summary: CashbookStats;
  period: {
    startDate: string;
    endDate: string;
  };
  generatedAt: string;
  generatedBy: string;
}
