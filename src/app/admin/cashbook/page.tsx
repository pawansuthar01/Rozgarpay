"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState, useEffect } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  XCircle,
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Download,
  IndianRupee,
} from "lucide-react";
import CashbookStatsCards from "@/components/admin/cashbook/CashbookStatsCards";
import CashbookFilters from "@/components/admin/cashbook/CashbookFilters";
import CashbookTable from "@/components/admin/cashbook/CashbookTable";
import CashbookForm from "@/components/admin/cashbook/CashbookForm";
import { useDebounce } from "@/lib/hooks";
import {
  useCashbook,
  useCreateCashbookEntry,
  useUpdateCashbookEntry,
  useReverseCashbookEntry,
  useDeleteCashbookEntry,
  useGenerateCashbookPDF,
} from "@/hooks";
import { useModal } from "@/components/ModalProvider";

export default function AdminCashbookPage() {
  const { data: session } = useSession();
  const { showMessage, showConfirm } = useModal();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [reversingEntryId, setReversingEntryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("");
  const [direction, setDirection] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string>("transactionDate");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 500);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    startDate,
    endDate,
    transactionType,
    direction,
    paymentMode,
    debouncedSearch,
    sortBy,
    sortOrder,
    pageLimit,
  ]);

  // Use the custom hooks
  const {
    data: cashbookData,
    isLoading: loading,
    error: fetchError,
  } = useCashbook({
    page: currentPage,
    limit: pageLimit,
    sortBy,
    sortOrder,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    transactionType: transactionType || undefined,
    direction: direction || undefined,
    paymentMode: paymentMode || undefined,
    search: debouncedSearch || undefined,
  });

  const createEntryMutation = useCreateCashbookEntry();
  const updateEntryMutation = useUpdateCashbookEntry();
  const reverseEntryMutation = useReverseCashbookEntry();
  const deleteEntryMutation = useDeleteCashbookEntry();
  const generatePDFMutation = useGenerateCashbookPDF();

  const handleSubmitEntry = (entryData: any) => {
    if (editingEntry) {
      // Update existing entry - wait for API response
      setEditingEntryId(editingEntry.id);
      updateEntryMutation.mutate(
        { entryId: editingEntry.id, data: entryData },
        {
          onSuccess: () => {
            setShowForm(false);
            setEditingEntry(null);
            showMessage("success", "Success", "Entry updated successfully");
          },
          onError: (error: any) => {
            console.error("Entry update error:", error);
            showMessage("error", "Error", "Failed to update entry");
          },
          onSettled: () => {
            setEditingEntryId(null);
          },
        },
      );
    } else {
      // Create new entry - wait for API response
      createEntryMutation.mutate(entryData, {
        onSuccess: () => {
          setShowForm(false);
          showMessage("success", "Success", "Entry created successfully");
        },
        onError: (error: any) => {
          console.error("Entry create error:", error);
          showMessage("error", "Error", "Failed to create entry");
        },
      });
    }
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleReverseEntry = (entryId: string, reason: string) => {
    // Show loading state and wait for API response
    setReversingEntryId(entryId);
    reverseEntryMutation.mutate(
      { entryId, reason },
      {
        onSuccess: () => {
          showMessage("success", "Success", "Entry reversed successfully");
        },
        onError: (error: any) => {
          console.error("Reverse entry error:", error);
          showMessage("error", "Error", "Failed to reverse entry");
        },
        onSettled: () => {
          setReversingEntryId(null);
        },
      },
    );
  };

  const handleDeleteEntry = (entryId: string) => {
    showConfirm(
      "Confirm Delete",
      "Are you sure you want to permanently delete this transaction? This action cannot be undone.",
      () => {
        // Show loading state and wait for API response
        setDeletingEntryId(entryId);
        deleteEntryMutation.mutate(entryId, {
          onSuccess: () => {
            showMessage("success", "Success", "Entry deleted successfully");
          },
          onError: (error: any) => {
            console.error("Delete entry error:", error);
            showMessage("error", "Error", "Failed to delete entry");
          },
          onSettled: () => {
            setDeletingEntryId(null);
          },
        });
      },
    );
  };

  const handleExportPDF = async () => {
    try {
      await generatePDFMutation.mutateAsync({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        transactionType: transactionType || undefined,
        direction: direction || undefined,
        paymentMode: paymentMode || undefined,
        search: debouncedSearch || undefined,
      });
    } catch (error) {
      console.error("PDF export error:", error);
      showMessage("error", "Error", "Failed to export PDF");
    }
  };

  if (!session || !["ADMIN", "MANAGER", "STAFF"].includes(session.user.role)) {
    return <Loading />;
  }

  const canCreate = ["ADMIN", "MANAGER"].includes(session.user.role);
  const canReverse = session.user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first container with responsive padding */}
      <div className="max-w-7xl mx-auto  sm:px-4 lg:px-6 xl:px-8  sm:py-6">
        {/* Header - Mobile optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col space-y-4">
            {/* Title and description */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-2.5 sm:p-3 rounded-xl shadow-sm">
                  <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl  sm:text-2xl lg:text-3xl font-bold text-gray-900">
                    Cashbook
                  </h1>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-0.5">
                    Track all company financial transactions
                  </p>
                </div>
              </div>

              {/* Mobile menu button for small screens */}
              <div className="flex items-center space-x-2">
                {canCreate && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 flex sm:gap-1 text-white p-2.5 sm:p-3 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    title="Add Transaction"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm hidden sm:flex">
                      Add Transaction
                    </span>
                  </button>
                )}
                <button
                  disabled={generatePDFMutation.isPending}
                  onClick={handleExportPDF}
                  className="bg-green-600 flex sm:gap-1 text-white p-2.5 sm:p-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Export PDF"
                >
                  {generatePDFMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span className="text-sm hidden sm:flex">
                        Generating...
                      </span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm hidden sm:flex">Export PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Desktop action buttons */}
          </div>
        </div>

        {/* Stats Cards - Mobile responsive */}
        <div className="mb-4 sm:mb-6">
          <CashbookStatsCards
            stats={cashbookData?.stats as any}
            loading={loading}
          />
        </div>

        {/* Cashbook Entries - Enhanced mobile design */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Filters - Mobile optimized */}
            <div className="mb-4 sm:mb-6">
              <CashbookFilters
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                transactionType={transactionType}
                setTransactionType={setTransactionType}
                direction={direction}
                setDirection={setDirection}
                paymentMode={paymentMode}
                setPaymentMode={setPaymentMode}
                pageLimit={pageLimit}
                setPageLimit={setPageLimit}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                search={search}
                setSearch={setSearch}
                userRole={session.user.role}
              />
            </div>

            {/* Error state - Mobile friendly */}
            {fetchError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Failed to load cashbook entries
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Please check your connection and try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Table - Mobile responsive */}
            <div className="overflow-x-auto">
              <CashbookTable
                entries={(cashbookData?.entries || []) as any}
                loading={loading}
                currentPage={currentPage}
                totalPages={cashbookData?.pagination?.totalPages || 1}
                onPageChange={setCurrentPage}
                itemsPerPage={pageLimit}
                onReverse={canReverse ? handleReverseEntry : undefined}
                onEdit={
                  ["ADMIN", "MANAGER"].includes(session.user.role)
                    ? handleEditEntry
                    : undefined
                }
                onDelete={
                  session.user.role === "ADMIN" ? handleDeleteEntry : undefined
                }
                userRole={session.user.role}
                deletingEntryId={deletingEntryId}
                reversingEntryId={reversingEntryId}
                editingEntryId={editingEntryId}
                showConfirm={showConfirm}
              />
            </div>
          </div>
        </div>

        {/* Mobile bottom spacing */}
        <div className="h-4 sm:h-6"></div>
      </div>

      {/* Create/Edit Entry Modal - Mobile optimized */}
      {showForm && canCreate && (
        <CashbookForm
          onSubmit={handleSubmitEntry}
          onCancel={() => {
            setShowForm(false);
            setEditingEntry(null);
          }}
          editEntry={editingEntry}
          isSubmitting={
            createEntryMutation.isPending || updateEntryMutation.isPending
          }
        />
      )}
    </div>
  );
}
