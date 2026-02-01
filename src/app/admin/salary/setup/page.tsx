"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useEffect, useState, useCallback } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { debounce } from "@/lib/utils";
import { useSalarySetup, useUpdateSalarySetup } from "@/hooks";
import {
  Search,
  Users,
  DollarSign,
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Filter,
  Building,
} from "lucide-react";

export default function AdminSalarySetupPage() {
  const { data: session } = useSession();
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [editingStaff, setEditingStaff] = useState<Set<string>>(new Set());
  const [salaryConfigs, setSalaryConfigs] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const {
    data,
    isLoading,
    error: queryError,
  } = useSalarySetup({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateSalarySetup = useUpdateSalarySetup();

  const staff = data?.staff || [];
  const totalCount = data?.pagination?.totalCount || 0;
  const totalPages = data?.pagination?.totalPages || 1;
  const loading = isLoading;
  const saving = updateSalarySetup.isPending;

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
    }
  }, [queryError]);

  // Clear success/error messages when mutation starts
  useEffect(() => {
    if (updateSalarySetup.isPending) {
      setError(null);
      setSuccess(null);
    }
  }, [updateSalarySetup.isPending]);

  // Debounced search function
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
      setCurrentPage(1); // Reset to first page when searching
    }, 500), // 500ms delay
    [],
  );

  // Initialize salary configs when data changes
  useEffect(() => {
    if (staff.length > 0) {
      const configs: Record<string, any> = {};
      staff.forEach((s) => {
        configs[s.id] = {
          baseSalary: s.baseSalary || "",
          hourlyRate: s.hourlyRate || "",
          dailyRate: s.dailyRate || "",
          salaryType: s.salaryType || "MONTHLY",
          workingDays: s.workingDays || 26,
          overtimeRate: s.overtimeRate || "",
          pfEsiApplicable: s.pfEsiApplicable ?? true,
          joiningDate: s.joiningDate
            ? new Date(s.joiningDate).toISOString().split("T")[0]
            : new Date(s.createdAt).toISOString().split("T")[0],
        };
      });
      setSalaryConfigs(configs);
    }
  }, [staff]);

  const handleStaffSelection = (staffId: string, selected: boolean) => {
    const newSelected = new Set(selectedStaff);
    if (selected) {
      newSelected.add(staffId);
    } else {
      newSelected.delete(staffId);
    }
    setSelectedStaff(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedStaff(new Set(currentPageStaff.map((s) => s.id)));
    } else {
      setSelectedStaff(new Set());
    }
  };

  const handleBulkEdit = () => {
    setEditingStaff(new Set(selectedStaff));
  };

  const handleSalaryConfigChange = (
    staffId: string,
    field: string,
    value: string,
  ) => {
    setSalaryConfigs({
      ...salaryConfigs,
      [staffId]: {
        ...salaryConfigs[staffId],
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    const staffUpdates = Array.from(editingStaff).map((staffId) => ({
      userId: staffId,
      ...salaryConfigs[staffId],
    }));

    try {
      await updateSalarySetup.mutateAsync({ staffUpdates });
      setSuccess(
        `Salary configurations saved for ${staffUpdates.length} employee(s)!`,
      );
      setEditingStaff(new Set());
      setSelectedStaff(new Set());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save salary configurations",
      );
    }
  };

  const currentPageStaff = staff;

  const getRoleColor = (role: string) => {
    switch (role) {
      case "MANAGER":
        return "bg-purple-100 text-purple-800";
      case "ACCOUNTANT":
        return "bg-green-100 text-green-800";
      case "STAFF":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto  sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Salary Setup
                  </h1>
                  <p className="mt-1 text-sm md:text-base text-gray-600">
                    Configure salary settings for all company employees
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                <span className="text-sm text-gray-600">
                  <Users className="h-4 w-4 inline mr-1" />
                  {totalCount} employee{totalCount !== 1 ? "s" : ""}
                </span>
              </div>
              {selectedStaff.size > 0 && (
                <button
                  onClick={handleBulkEdit}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Selected ({selectedStaff.size})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Search & Filter
              </h3>
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees by name, email, or role..."
                  defaultValue={searchTerm}
                  onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-3 rounded-lg">
                <Filter className="h-4 w-4" />
                <span>Filter by name, email, or role</span>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {(success || error) && (
          <div className="mb-6">
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Actions */}
          <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={
                    currentPageStaff.length > 0 &&
                    currentPageStaff.every((s) => selectedStaff.has(s.id))
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({currentPageStaff.length})
                </span>
              </div>
              {editingStaff.size > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setEditingStaff(new Set())}
                    className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Staff List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-4 md:p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton circle width={20} height={20} />
                    <div className="flex-1">
                      <Skeleton width={200} height={20} />
                      <Skeleton width={150} height={16} className="mt-1" />
                    </div>
                    <Skeleton width={100} height={20} />
                  </div>
                </div>
              ))
            ) : staff.length === 0 ? (
              <div className="p-12 text-center">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No employees found
                </h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "No employees available."}
                </p>
              </div>
            ) : (
              staff.map((member) => {
                const isSelected = selectedStaff.has(member.id);
                const isEditing = editingStaff.has(member.id);

                return (
                  <div
                    key={member.id}
                    className={`p-4 md:p-6 hover:bg-gray-50 transition-colors ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    {/* Desktop View */}
                    <div className="hidden md:block">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            handleStaffSelection(member.id, e.target.checked)
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div>
                                <div className="font-medium text-gray-900 truncate">
                                  {member.firstName} {member.lastName}
                                </div>
                                <div className="text-sm text-gray-500 truncate">
                                  {member.email}
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}
                              >
                                {member.role}
                              </span>
                            </div>

                            {isEditing ? (
                              <div className="grid grid-cols-4 gap-2 ml-4">
                                <div>
                                  <select
                                    value={
                                      salaryConfigs[member.id]?.salaryType ||
                                      "MONTHLY"
                                    }
                                    onChange={(e) =>
                                      handleSalaryConfigChange(
                                        member.id,
                                        "salaryType",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="DAILY">Daily</option>
                                    <option value="HOURLY">Hourly</option>
                                  </select>
                                </div>

                                {salaryConfigs[member.id]?.salaryType ===
                                "MONTHLY" ? (
                                  <div>
                                    <input
                                      type="number"
                                      placeholder="Monthly"
                                      value={
                                        salaryConfigs[member.id]?.baseSalary ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleSalaryConfigChange(
                                          member.id,
                                          "baseSalary",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                ) : salaryConfigs[member.id]?.salaryType ===
                                  "DAILY" ? (
                                  <div>
                                    <input
                                      type="number"
                                      placeholder="Daily"
                                      value={
                                        salaryConfigs[member.id]?.dailyRate ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleSalaryConfigChange(
                                          member.id,
                                          "dailyRate",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <input
                                      type="number"
                                      placeholder="Hourly"
                                      value={
                                        salaryConfigs[member.id]?.hourlyRate ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleSalaryConfigChange(
                                          member.id,
                                          "hourlyRate",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                )}

                                <div>
                                  <input
                                    type="number"
                                    placeholder="Daily"
                                    value={
                                      salaryConfigs[member.id]?.dailyRate || ""
                                    }
                                    onChange={(e) =>
                                      handleSalaryConfigChange(
                                        member.id,
                                        "dailyRate",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <input
                                    type="number"
                                    placeholder="Working Days"
                                    value={
                                      salaryConfigs[member.id]?.workingDays ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleSalaryConfigChange(
                                        member.id,
                                        "workingDays",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-6 ml-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">
                                    {member.salaryType === "MONTHLY"
                                      ? `₹${member.baseSalary || 0}/month`
                                      : member.salaryType === "DAILY"
                                        ? `₹${member.dailyRate || 0}/day`
                                        : `₹${member.hourlyRate || 0}/hour`}
                                  </span>
                                </div>
                                {member.salaryType !== "DAILY" && (
                                  <div>
                                    <span className="text-gray-500">
                                      Daily:{" "}
                                    </span>
                                    <span className="font-medium">
                                      ₹{member.dailyRate || 0}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden overflow-x-auto">
                      <div className="flex items-start space-x-3 overflow-x-auto scrollbar-hide">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            handleStaffSelection(member.id, e.target.checked)
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {member.firstName} {member.lastName}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {member.email}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}
                            >
                              {member.role}
                            </span>
                          </div>

                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Type
                                  </label>
                                  <select
                                    value={
                                      salaryConfigs[member.id]?.salaryType ||
                                      "MONTHLY"
                                    }
                                    onChange={(e) =>
                                      handleSalaryConfigChange(
                                        member.id,
                                        "salaryType",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="DAILY">Daily</option>
                                    <option value="HOURLY">Hourly</option>
                                  </select>
                                </div>

                                {salaryConfigs[member.id]?.salaryType ===
                                "MONTHLY" ? (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Monthly Salary
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="₹0"
                                      value={
                                        salaryConfigs[member.id]?.baseSalary ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleSalaryConfigChange(
                                          member.id,
                                          "baseSalary",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                ) : salaryConfigs[member.id]?.salaryType ===
                                  "DAILY" ? (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Daily Rate
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="₹0"
                                      value={
                                        salaryConfigs[member.id]?.dailyRate ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleSalaryConfigChange(
                                          member.id,
                                          "dailyRate",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Hourly Rate
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="₹0"
                                      value={
                                        salaryConfigs[member.id]?.hourlyRate ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleSalaryConfigChange(
                                          member.id,
                                          "hourlyRate",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Daily Rate
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="₹0"
                                    value={
                                      salaryConfigs[member.id]?.dailyRate || ""
                                    }
                                    onChange={(e) =>
                                      handleSalaryConfigChange(
                                        member.id,
                                        "dailyRate",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Working Days
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="26"
                                    value={
                                      salaryConfigs[member.id]?.workingDays ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleSalaryConfigChange(
                                        member.id,
                                        "workingDays",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Overtime Rate
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="₹0"
                                    value={
                                      salaryConfigs[member.id]?.overtimeRate ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleSalaryConfigChange(
                                        member.id,
                                        "overtimeRate",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    PF/ESI
                                  </label>
                                  <select
                                    value={
                                      salaryConfigs[member.id]?.pfEsiApplicable
                                        ? "yes"
                                        : "no"
                                    }
                                    onChange={(e) =>
                                      handleSalaryConfigChange(
                                        member.id,
                                        "pfEsiApplicable",
                                        e.target.value === "yes"
                                          ? "true"
                                          : "false",
                                      )
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Joining Date
                                </label>
                                <input
                                  type="date"
                                  value={
                                    salaryConfigs[member.id]?.joiningDate || ""
                                  }
                                  onChange={(e) =>
                                    handleSalaryConfigChange(
                                      member.id,
                                      "joiningDate",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Salary</p>
                                <p className="font-semibold text-gray-900">
                                  {member.salaryType === "MONTHLY"
                                    ? `₹${member.baseSalary || 0}/month`
                                    : member.salaryType === "DAILY"
                                      ? `₹${member.dailyRate || 0}/day`
                                      : `₹${member.hourlyRate || 0}/hour`}
                                </p>
                              </div>
                              {member.salaryType !== "DAILY" && (
                                <div>
                                  <p className="text-gray-500">Daily Rate</p>
                                  <p className="font-semibold text-gray-900">
                                    ₹{member.dailyRate || 0}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg">
                  <span className="font-medium">{staff.length}</span> staff on
                  page <span className="font-medium">{currentPage}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum =
                        Math.max(1, Math.min(totalPages - 4, currentPage - 2)) +
                        i;
                      if (pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            pageNum === currentPage
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
