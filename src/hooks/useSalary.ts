import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SalaryRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  totalDays: number;
  totalWorkingHours: number;
  overtimeHours: number;
  approvedDays: number;
  lateMinutes: number;
  halfDays: number;
  netSalary: number;
  absentDays: number;
  baseAmount: number;
  overtimeAmount: number;
  penaltyAmount: number;
  deductions: number;
  grossAmount: number;
  netAmount: number;
  status: string;
  paidAt?: string;
  pdfUrl?: string;
  approvedByUser?: {
    firstName: string;
    lastName: string;
  };
  rejectedByUser?: {
    firstName: string;
    lastName: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  breakdowns: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
}

interface SalaryBreakdown {
  id: string;
  salaryId: string;
  type: "BASE" | "PAYMENT" | "DEDUCTION" | "RECOVERY" | "ADVANCE";
  description: string;
  amount: number;
  date: string;
}

interface SalaryResponse {
  salaries: SalaryRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface GenerateSalaryRequest {
  month: number;
  year: number;
  companyId: string;
}

interface GenerateSalaryResponse {
  success: boolean;
  generatedCount: number;
  errors: string[];
}

interface AddPaymentRequest {
  amount: number;
  reason: string;
  mode: string;
  paymentDate: string;
}

interface AddPaymentResponse {
  paymentId: string;
  newBalance: number;
}

interface AddDeductionRequest {
  cycle: string;
  recordDate: string;
  amount: number;
  description?: string;
}

interface AddDeductionResponse {
  success: boolean;
  message: string;
}

// Query: Get salaries
export function useSalaries(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  month?: number;
  year?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["salaries", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.userId) searchParams.set("userId", params.userId);
      if (params?.month) searchParams.set("month", params.month.toString());
      if (params?.year) searchParams.set("year", params.year.toString());
      if (params?.status) searchParams.set("status", params.status);
      if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
      if (params?.search) searchParams.set("search", params.search);

      const response = await fetch(`/api/admin/salary?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch salaries");
      }
      return response.json() as Promise<{
        records: SalaryRecord[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        stats: {
          totalRecords: number;
          pending: number;
          approved: number;
          paid: number;
          rejected: number;
          totalAmount: number;
        };
        charts: {
          statusDistribution: { name: string; value: number; color: string }[];
          monthlyTotals: { month: string; amount: number }[];
        };
      }>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation: Generate salaries
export function useGenerateSalaries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateSalaryRequest) => {
      const response = await fetch("/api/admin/salary/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate salaries");
      }

      return response.json() as Promise<GenerateSalaryResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
    },
  });
}

// Query: Get salary by ID
export function useSalary(salaryId: string) {
  return useQuery({
    queryKey: ["salary", salaryId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/salary/${salaryId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch salary");
      }
      return response.json() as Promise<SalaryRecord>;
    },
    enabled: !!salaryId,
  });
}

// Mutation: Approve salary
export function useApproveSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salaryId: string) => {
      const response = await fetch(`/api/admin/salary/${salaryId}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve salary");
      }

      return response.json() as Promise<SalaryRecord>;
    },
    onSuccess: (data, salaryId) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["salary", salaryId] });
    },
  });
}

// Mutation: Reject salary
export function useRejectSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salaryId: string) => {
      const response = await fetch(`/api/admin/salary/${salaryId}/reject`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject salary");
      }

      return response.json() as Promise<SalaryRecord>;
    },
    onSuccess: (data, salaryId) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["salary", salaryId] });
    },
  });
}

// Mutation: Mark salary as paid
export function useMarkSalaryPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      salaryId,
      paymentData,
    }: {
      salaryId: string;
      paymentData: {
        date: string;
        method: string;
        reference?: string;
        sendNotification?: boolean;
      };
    }) => {
      const response = await fetch(`/api/admin/salary/${salaryId}/mark-paid`, {
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark salary as paid");
      }

      return response.json() as Promise<{ salary: SalaryRecord }>;
    },
    onSuccess: (data, variables) => {
      const salaryId = variables.salaryId;
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["salary", salaryId] });
    },
  });
}

// Mutation: Recalculate salary
export function useRecalculateSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salaryId: string) => {
      const response = await fetch(
        `/api/admin/salary/${salaryId}/recalculate`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to recalculate salary");
      }

      return response.json() as Promise<SalaryRecord>;
    },
    onSuccess: (data, salaryId) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["salary", salaryId] });
    },
  });
}

// Mutation: Add payment to user
export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: AddPaymentRequest;
    }) => {
      const response = await fetch(`/api/admin/users/${userId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add payment");
      }

      return response.json() as Promise<AddPaymentResponse>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      // Invalidate user profile queries
      queryClient.invalidateQueries({
        queryKey: ["userProfile", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["userCurrentMonth", variables.userId],
      });
    },
  });
}

interface RecoverPaymentRequest {
  amount: number;
  recoverDate: string;
  reason: string;
}

interface RecoverPaymentResponse {
  success: boolean;
  message: string;
}

// Mutation: Recover payment from user
export function useRecoverPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: RecoverPaymentRequest;
    }) => {
      const response = await fetch(
        `/api/admin/users/${userId}/recover-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to recover payment");
      }

      return response.json() as Promise<RecoverPaymentResponse>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      // Invalidate user profile queries
      queryClient.invalidateQueries({
        queryKey: ["userProfile", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["userCurrentMonth", variables.userId],
      });
    },
  });
}

// Query: Get staff salaries
export function useStaffSalaries(params?: { month?: number; year?: number }) {
  return useQuery({
    queryKey: ["staff", "salaries", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.month) searchParams.set("month", params.month.toString());
      if (params?.year) searchParams.set("year", params.year.toString());

      const response = await fetch(`/api/staff/salary?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch staff salaries");
      }
      return response.json() as Promise<{
        salaries: SalaryRecord[];
        currentSalary?: SalaryRecord;
        stats: {
          totalSalaries: number;
          pending: number;
          approved: number;
          paid: number;
          rejected: number;
          totalEarned: number;
        };
        currentMonth: number;
        currentYear: number;
      }>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Query: Get staff salary overview
export function useStaffSalaryOverview() {
  return useQuery({
    queryKey: ["staff", "salary", "overview"],
    queryFn: async () => {
      const response = await fetch("/api/staff/salary/overview");
      if (!response.ok) {
        throw new Error("Failed to fetch staff salary overview");
      }
      return response.json() as Promise<{
        totalOwed: number;
        totalOwe: number;
        pendingAmount: number;
        monthlyBreakdown: Array<{
          month: number;
          year: number;
          given: number;
          taken: number;
          net: number;
          balance: number;
          status: string;
        }>;
        recentTransactions: Array<{
          id: string;
          type: string;
          description: string;
          amount: number;
          date: string;
          salaryMonth?: string;
        }>;
        currentMonth: {
          owed: number;
          owe: number;
          net: number;
        };
      }>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation: Add deduction to user
export function useAddDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: AddDeductionRequest;
    }) => {
      const response = await fetch(`/api/admin/users/${userId}/deductions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add deduction");
      }

      return response.json() as Promise<AddDeductionResponse>;
    },
    onSuccess: (data, variables) => {
      // Invalidate salary-related queries
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["salary"] });
      // Invalidate user profile queries
      queryClient.invalidateQueries({
        queryKey: ["userProfile", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["userCurrentMonth", variables.userId],
      });
    },
  });
}

// Query: Get salary reports
export function useSalaryReports(params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["salary", "reports", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.set("startDate", params.startDate);
      if (params?.endDate) searchParams.set("endDate", params.endDate);
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      const response = await fetch(`/api/admin/reports/salary?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch salary reports");
      }
      return response.json() as Promise<{
        totalPayout: number;
        staffCount: number;
        monthlyBreakdown: { month: string; amount: number }[];
        staffBreakdown: {
          userId: string;
          user: {
            firstName: string | null;
            lastName: string | null;
            email: string;
          };
          totalAmount: number;
        }[];
        statusDistribution: { name: string; value: number; color: string }[];
        totalPages: number;
      }>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation: Download salary slip
export function useSalarySlipDownload() {
  return useMutation({
    mutationFn: async ({
      year,
      month,
      type,
    }: {
      year: number;
      month: number;
      type: "full" | "summary";
    }) => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        type: type,
      });

      const res = await fetch(`/api/staff/salary-slips/generate?${params}`);
      const contentType = res.headers.get("content-type");

      if (!res.ok || !contentType?.includes("pdf")) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to generate PDF");
      }

      const blob = await res.blob();
      return new File([blob], `${type}-salary-slip-${month}-${year}.pdf`, {
        type: "application/pdf",
      });
    },
  });
}

// Mutation: Generate salary report
export function useGenerateSalaryReport() {
  return useMutation({
    mutationFn: async ({ format }: { format?: string }) => {
      const response = await fetch("/api/staff/salary/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: format || "pdf" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate report");
      }

      const blob = await response.blob();
      return blob;
    },
  });
}
