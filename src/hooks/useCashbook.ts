import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CashbookEntry,
  CashbookApiResponse,
  CashbookBalance,
  CreateCashbookEntryRequest,
  CashbookFilters,
  CashbookStats,
  CashbookReportData,
} from "@/types/cashbook";
import { getDate } from "@/lib/attendanceUtils";

// Query: Get cashbook entries
export function useCashbook(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  direction?: string;
  paymentMode?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["cashbook", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
      if (params?.startDate) searchParams.set("startDate", params.startDate);
      if (params?.endDate) searchParams.set("endDate", params.endDate);
      if (params?.transactionType)
        searchParams.set("transactionType", params.transactionType);
      if (params?.direction) searchParams.set("direction", params.direction);
      if (params?.paymentMode)
        searchParams.set("paymentMode", params.paymentMode);
      if (params?.search) searchParams.set("search", params.search);

      const response = await fetch(`/api/admin/cashbook?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cashbook entries");
      }
      return response.json() as Promise<CashbookApiResponse>;
    },
    staleTime: 1000 * 30, // 30 seconds - shorter stale time for faster updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

// Query: Get cashbook balance
export function useCashbookBalance() {
  return useQuery({
    queryKey: ["cashbook", "balance"],
    queryFn: async () => {
      const response = await fetch("/api/admin/cashbook/balance");
      if (!response.ok) {
        throw new Error("Failed to fetch cashbook balance");
      }
      return response.json() as Promise<CashbookBalance>;
    },
    staleTime: 1000 * 30, // 30 seconds - shorter stale time for faster updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

// Mutation: Create cashbook entry
export function useCreateCashbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCashbookEntryRequest) => {
      const response = await fetch("/api/admin/cashbook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create cashbook entry");
      }

      return response.json();
    },
    onSuccess: (newEntry) => {
      // Update all cashbook queries by adding the new entry
      queryClient.setQueriesData({ queryKey: ["cashbook"] }, (oldData: any) => {
        if (!oldData) return oldData;

        const updatedEntries = [newEntry.entry, ...oldData.entries];

        // Recalculate stats based on all entries
        const totalCredit = updatedEntries
          .filter((entry) => entry.direction === "CREDIT" && !entry.isReversed)
          .reduce((sum, entry) => sum + entry.amount, 0);

        const totalDebit = updatedEntries
          .filter((entry) => entry.direction === "DEBIT" && !entry.isReversed)
          .reduce((sum, entry) => sum + entry.amount, 0);

        const currentBalance = totalCredit - totalDebit;

        return {
          ...oldData,
          entries: updatedEntries,
          pagination: {
            ...oldData.pagination,
            total: oldData.pagination.total + 1,
          },
          stats: {
            ...oldData.stats,
            currentBalance,
            totalCredit,
            totalDebit,
            transactionCount: oldData.stats.transactionCount + 1,
          },
        };
      });

      // Update balance
      queryClient.invalidateQueries({ queryKey: ["cashbook", "balance"] });
    },
  });
}

// Query: Get cashbook entry by ID
export function useCashbookEntry(entryId: string) {
  return useQuery({
    queryKey: ["cashbook", entryId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/cashbook/${entryId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cashbook entry");
      }
      return response.json() as Promise<CashbookEntry>;
    },
    enabled: !!entryId,
  });
}

// Mutation: Update cashbook entry
export function useUpdateCashbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      data,
    }: {
      entryId: string;
      data: Partial<CreateCashbookEntryRequest>;
    }) => {
      const response = await fetch(`/api/admin/cashbook/${entryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update cashbook entry");
      }

      return response.json();
    },
    onSuccess: (updatedEntry, variables) => {
      // Update all cashbook queries by replacing the updated entry
      queryClient.setQueriesData({ queryKey: ["cashbook"] }, (oldData: any) => {
        if (!oldData || !oldData.entries) return oldData;

        const updatedEntries = oldData.entries.map((entry: any) =>
          entry.id === variables.entryId ? updatedEntry.entry : entry,
        );

        // Recalculate stats based on all entries
        const totalCredit = updatedEntries
          .filter(
            (entry: any) => entry.direction === "CREDIT" && !entry.isReversed,
          )
          .reduce((sum: number, entry: any) => sum + entry.amount, 0);

        const totalDebit = updatedEntries
          .filter(
            (entry: any) => entry.direction === "DEBIT" && !entry.isReversed,
          )
          .reduce((sum: number, entry: any) => sum + entry.amount, 0);

        const currentBalance = totalCredit - totalDebit;

        return {
          ...oldData,
          entries: updatedEntries,
          stats: {
            ...oldData.stats,
            currentBalance,
            totalCredit,
            totalDebit,
          },
        };
      });

      // Update the specific entry query
      queryClient.setQueryData(
        ["cashbook", variables.entryId],
        updatedEntry.entry,
      );

      // Update balance
      queryClient.invalidateQueries({ queryKey: ["cashbook", "balance"] });
    },
  });
}

// Mutation: Delete cashbook entry
export function useDeleteCashbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const response = await fetch(`/api/admin/cashbook/${entryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete cashbook entry");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook", "balance"] });
    },
  });
}

// Mutation: Reverse cashbook entry
export function useReverseCashbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      reason,
    }: {
      entryId: string;
      reason: string;
    }) => {
      const response = await fetch(`/api/admin/cashbook/${entryId}/reverse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: "Failed to reverse entry",
        }));
        throw new Error(error.error || "Failed to reverse entry");
      }

      return response.json();
    },
    onSuccess: (_reversedEntry, variables) => {
      // Update all cashbook queries by marking the entry as reversed
      queryClient.setQueriesData({ queryKey: ["cashbook"] }, (oldData: any) => {
        if (!oldData || !oldData.entries) return oldData;

        const updatedEntries = oldData.entries.map((entry: any) =>
          entry.id === variables.entryId
            ? { ...entry, isReversed: true }
            : entry,
        );

        // Recalculate stats based on all entries (excluding reversed ones)
        const totalCredit = updatedEntries
          .filter(
            (entry: any) => entry.direction === "CREDIT" && !entry.isReversed,
          )
          .reduce((sum: number, entry: any) => sum + entry.amount, 0);

        const totalDebit = updatedEntries
          .filter(
            (entry: any) => entry.direction === "DEBIT" && !entry.isReversed,
          )
          .reduce((sum: number, entry: any) => sum + entry.amount, 0);

        const currentBalance = totalCredit - totalDebit;

        return {
          ...oldData,
          entries: updatedEntries,
          stats: {
            ...oldData.stats,
            currentBalance,
            totalCredit,
            totalDebit,
          },
        };
      });

      // Update balance
      queryClient.invalidateQueries({ queryKey: ["cashbook", "balance"] });
    },
  });
}

// Query: Get cashbook reports
export function useCashbookReports(params?: {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: ["cashbook", "reports", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
      if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
      if (params?.type) searchParams.set("type", params.type);

      const response = await fetch(
        `/api/admin/cashbook/reports?${searchParams}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch cashbook reports");
      }
      return response.json() as Promise<CashbookReportData>;
    },
  });
}

// Mutation: Generate cashbook PDF
export function useGenerateCashbookPDF() {
  return useMutation({
    mutationFn: async (params: {
      startDate?: string;
      endDate?: string;
      transactionType?: string;
      direction?: string;
      paymentMode?: string;
      search?: string;
    }) => {
      const searchParams = new URLSearchParams({
        format: "pdf",
      });

      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      if (params.transactionType)
        searchParams.set("transactionType", params.transactionType);
      if (params.direction) searchParams.set("direction", params.direction);
      if (params.paymentMode)
        searchParams.set("paymentMode", params.paymentMode);
      if (params.search) searchParams.set("search", params.search);

      const response = await fetch(
        `/api/admin/cashbook/reports?${searchParams}`,
      );
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cashbook-report-${getDate(new Date()).toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    },
  });
}
