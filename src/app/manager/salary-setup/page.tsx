"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
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
} from "lucide-react";

interface StaffMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  baseSalary: number | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  salaryType: string | null;
  workingDays: number | null;
  overtimeRate: number | null;
  pfEsiApplicable: boolean | null;
  joiningDate: string | null;
  createdAt: string;
}

export default function SalarySetupPage() {
  const { data: session } = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [editingStaff, setEditingStaff] = useState<Set<string>>(new Set());
  const [salaryConfigs, setSalaryConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchStaff();
  }, [currentPage, searchTerm]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchTerm) {
        params.set("search", searchTerm);
      }

      const res = await fetch(`/api/manager/salary-setup?${params}`);
      const data = await res.json();

      if (res.ok) {
        setStaff(data.staff);
        setTotalCount(data.pagination.totalCount);
        setTotalPages(data.pagination.totalPages);

        // Initialize salary configs
        const configs: Record<string, any> = {};
        data.staff.forEach((s: StaffMember) => {
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
      } else {
        setError(data.error || "Failed to fetch staff");
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      setError("Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  };

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
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const staffUpdates = Array.from(editingStaff).map((staffId) => ({
        userId: staffId,
        ...salaryConfigs[staffId],
      }));

      const res = await fetch("/api/manager/salary-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffUpdates }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(
          `Salary configurations saved for ${staffUpdates.length} staff member(s)!`,
        );
        setEditingStaff(new Set());
        setSelectedStaff(new Set());
        // Refresh data
        await fetchStaff();
      } else {
        setError(data.error || "Failed to save salary configurations");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      setError("Failed to save salary configurations");
    } finally {
      setSaving(false);
    }
  };

  const currentPageStaff = staff;

  if (!session || session.user.role !== "MANAGER") {
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                💰 Salary Setup
              </h1>
              <p className="mt-2 text-gray-600">
                Configure salary settings for your team members
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                {totalCount} team member{totalCount !== 1 ? "s" : ""}
              </div>
              {selectedStaff.size > 0 && (
                <button
                  onClick={handleBulkEdit}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Selected ({selectedStaff.size})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Filter by name or email
            </span>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {(success || error) && (
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
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
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
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
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton circle width={20} height={20} />
                    <div className="flex-1">
                      <Skeleton width={200} height={20} />
                      <Skeleton width={150} height={16} className="mt-1" />
                    </div>
                    <Skeleton width={100} height={20} />
                    <Skeleton width={120} height={20} />
                  </div>
                </div>
              ))
            ) : staff.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No team members found
                </h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "No team members available."}
                </p>
              </div>
            ) : (
              staff.map((member) => {
                const isSelected = selectedStaff.has(member.id);
                const isEditing = editingStaff.has(member.id);

                return (
                  <div
                    key={member.id}
                    className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
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
                          <div>
                            <div className="font-medium text-gray-900 truncate">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {member.email}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-4">
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
                                      salaryConfigs[member.id]?.baseSalary || ""
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
                              ) : (
                                <div>
                                  <input
                                    type="number"
                                    placeholder="Hourly"
                                    value={
                                      salaryConfigs[member.id]?.hourlyRate || ""
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
                                    salaryConfigs[member.id]?.workingDays || ""
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

                              <div>
                                <input
                                  type="number"
                                  placeholder="Overtime Rate"
                                  value={
                                    salaryConfigs[member.id]?.overtimeRate || ""
                                  }
                                  onChange={(e) =>
                                    handleSalaryConfigChange(
                                      member.id,
                                      "overtimeRate",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>

                              <div>
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
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="yes">PF/ESI Yes</option>
                                  <option value="no">PF/ESI No</option>
                                </select>
                              </div>

                              <div>
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
                                    : `₹${member.hourlyRate || 0}/hour`}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Daily: </span>
                                <span className="font-medium">
                                  ₹{member.dailyRate || 0}
                                </span>
                              </div>
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
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
                  {totalCount} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
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
