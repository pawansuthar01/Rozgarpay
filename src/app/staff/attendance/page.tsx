"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  CalendarOff,
  ClockAlert,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import PunchModal from "@/components/PunchModal";
import {
  useStaffAttendance,
  useTodayAttendance,
  useStaffPunchAttendance,
} from "@/hooks/useStaffAttendance";
import {
  useStaffDashboard,
  prefetchStaffDashboard,
} from "@/hooks/useStaffDashboard";
import { useModal } from "@/components/ModalProvider";
import { useQueryClient } from "@tanstack/react-query";
import { convertSeconds, isToday } from "@/lib/utils";

interface ValidationData {
  valid: boolean;
  error?: string;
  punchType: "in" | "out";
  attendanceId?: string;
  lateMinutes?: number;
  isLate?: boolean;
}

type StatusType =
  | "all"
  | "present"
  | "absent"
  | "leave"
  | "pending"
  | "no-record";

export default function StaffAttendancePage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [punchType, setPunchType] = useState<"in" | "out">("in");
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");

  const { showMessage } = useModal();
  const queryClient = useQueryClient();

  // Prefetch dashboard data for faster salary check
  useEffect(() => {
    prefetchStaffDashboard(queryClient);
  }, [queryClient]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Navigate months
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Check salary setup - redirect if not configured
  const { data: dashboardData, isLoading: dashboardLoading } =
    useStaffDashboard();

  const { data: attendanceData, isLoading: attendanceLoading } =
    useStaffAttendance(year, month);
  const { data: todaysAttendance } = useTodayAttendance();
  const punchMutation = useStaffPunchAttendance();
  const now = new Date();
  const isFutureMonth =
    currentDate.getFullYear() > now.getFullYear() ||
    (currentDate.getFullYear() === now.getFullYear() &&
      currentDate.getMonth() >= now.getMonth());
  const filteredAttendance = useMemo(() => {
    if (!attendanceData?.records) return [];

    if (statusFilter === "all") return attendanceData.records;

    return attendanceData.records.filter((record) => {
      switch (statusFilter) {
        case "present":
          // Present: has record with APPROVED status (regardless of punchIn/punchOut)
          return record.hasRecord && record.status === "APPROVED";
        case "absent":
          // Absent: has record with REJECTED or ABSENT status
          return (
            record.hasRecord &&
            (record.status === "REJECTED" || record.status === "ABSENT")
          );
        case "leave":
          // Leave: has record with LEAVE status
          return record.hasRecord && record.status === "LEAVE";
        case "pending":
          // Pending: has record with PENDING status
          return record.hasRecord && record.status === "PENDING";
        case "no-record":
          // No record: doesn't have any record
          return !record.hasRecord;
        default:
          return true;
      }
    });
  }, [attendanceData?.records, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = attendanceData?.summary.total;
    const pending = attendanceData?.summary.pendingDays;
    const noRecord = attendanceData?.summary.noMarkedDays;
    const present = attendanceData?.summary.presentDays;
    const absent = attendanceData?.summary.absentDays;
    const leave = attendanceData?.summary.leaveDays;
    const totalWorkingHours = attendanceData?.summary.totalWorkingHours;
    const totalOvertimeHours = attendanceData?.summary.totalOvertimeHours;

    return {
      total,
      pending,
      present,
      noRecord,
      absent,
      leave,

      totalWorkingHours,
      totalOvertimeHours,
    };
  }, [attendanceData]);

  const getStatusDisplay = (status: string | null, hasRecord: boolean) => {
    if (!hasRecord || !status) {
      return {
        bgColor: "bg-gray-100",
        textColor: "text-gray-600",
        borderColor: "border-gray-200",
        icon: <AlertCircle className="h-4 w-4 text-gray-400" />,
        label: "No Record",
      };
    }
    switch (status) {
      case "APPROVED":
        return {
          bgColor: "bg-green-100",
          textColor: "text-green-800",
          borderColor: "border-green-200",
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          label: "Present",
        };
      case "REJECTED":
        return {
          bgColor: "bg-red-100",
          textColor: "text-red-800",
          borderColor: "border-red-200",
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          label: "Absent",
        };
      case "PENDING":
        return {
          bgColor: "bg-amber-100",
          textColor: "text-amber-800",
          borderColor: "border-amber-200",
          icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
          label: "Pending",
        };
      case "LEAVE":
        return {
          bgColor: "bg-blue-100",
          textColor: "text-blue-800",
          borderColor: "border-blue-200",
          icon: <CalendarOff className="h-4 w-4 text-blue-600" />,
          label: "Leave",
        };
      case "ABSENT":
        return {
          bgColor: "bg-gray-100",
          textColor: "text-gray-800",
          borderColor: "border-gray-200",
          icon: <XCircle className="h-4 w-4 text-gray-600" />,
          label: "Absent",
        };
      default:
        return {
          bgColor: "bg-gray-100",
          textColor: "text-gray-600",
          borderColor: "border-gray-200",
          icon: <AlertCircle className="h-4 w-4 text-gray-400" />,
          label: "No Record",
        };
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "--:--";
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateStr: string) => {
    // Parse date string carefully to avoid timezone issues
    const [yearStr, monthStr, dayStr] = dateStr.split("-");
    const date = new Date(
      parseInt(yearStr),
      parseInt(monthStr) - 1,
      parseInt(dayStr),
    );
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
  };

  const handlePunchClick = (type: "in" | "out") => {
    setPunchType(type);
    setModalOpen(true);
  };

  const handlePunchComplete = async (
    type: "in" | "out",
    imageData: string,
    validation: ValidationData,
  ) => {
    setModalOpen(false);
    try {
      await punchMutation.mutateAsync(
        { type, imageData, validation },
        {
          onError: (error: Error) => {
            let errorMessage = error.message || "Failed to complete punch";
            let errorTitle = "Punch Failed";

            showMessage("error", errorTitle, errorMessage);
          },
          onSuccess: () => {
            showMessage(
              "success",
              "Success!",
              `Successfully punched ${type === "in" ? "in" : "out"}!`,
            );
          },
        },
      );

      return true;
    } catch (error) {
      return false;
    }
  };

  // Show loading or salary pending state
  if (
    !dashboardLoading &&
    dashboardData &&
    !dashboardData.salarySetup?.isConfigured
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-sm md:max-w-2xl mx-auto px-4 py-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <ClockAlert className="h-10 w-10 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 mb-2">
                  Salary Setup Required
                </h3>
                <p className="text-sm text-amber-700 mb-4">
                  Please configure your salary details on the dashboard first.
                </p>
                <button
                  onClick={() => router.push("/staff/dashboard")}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (attendanceLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-sm md:max-w-2xl mx-auto px-2 py-3 space-y-2">
          <div className="animate-pulse space-y-2">
            <div className="h-28 bg-white/90 rounded-2xl"></div>
            <div className="h-64 bg-white/90 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:max-w-2xl mx-auto px-2 py-3 space-y-2">
        {/* Header Card with Month Navigation */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">My Attendance</h1>
              <p className="text-gray-600 text-xs">
                {currentDate.toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={() => navigateMonth("next")}
              disabled={isFutureMonth}
              className={`p-2 rounded-lg transition-colors ${
                currentDate.getMonth() === new Date().getMonth()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100 active:bg-gray-200"
              }`}
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Punch Buttons or Status Display */}
          {todaysAttendance?.punchOut == null &&
          todaysAttendance?.status == "PENDING" ? (
            <div className="flex justify-center">
              <button
                onClick={() => handlePunchClick("out")}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 active:scale-95 flex flex-col items-center space-y-1 w-full max-w-xs"
              >
                <ArrowUpCircle className="h-5 w-5" />
                <span className="text-xs">Punch Out</span>
              </button>
            </div>
          ) : todaysAttendance ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                {getStatusDisplay(todaysAttendance.status, true).icon}
                <span className="text-sm font-semibold text-gray-900">
                  {getStatusDisplay(todaysAttendance.status, true).label}
                </span>
              </div>
              <div className="flex justify-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3" />
                  {formatTime(todaysAttendance.punchIn)}
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpCircle className="h-3 w-3" />
                  {formatTime(todaysAttendance.punchOut)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => handlePunchClick("in")}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 active:scale-95 flex flex-col items-center space-y-1 w-full max-w-xs"
              >
                <ArrowDownCircle className="h-5 w-5" />
                <span className="text-xs">Punch In</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl  p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.present}
            </div>
            <div className="text-xs text-gray-600">Present</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.absent}
            </div>
            <div className="text-xs text-gray-600">Absent</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.leave}
            </div>
            <div className="text-xs text-gray-600">Leave</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-amber-600">
              {stats.totalOvertimeHours}
            </div>
            <div className="text-xs text-gray-600">total overtime</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-600">
              {stats.totalWorkingHours}
            </div>
            <div className="text-xs text-gray-600">total working time</div>
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusType)}
              className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All ({stats?.total})</option>
              <option value="present">Present ({stats?.present})</option>
              <option value="absent">Absent ({stats?.absent})</option>
              <option value="leave">Leave ({stats?.leave})</option>
              <option value="pending">Pending ({stats?.pending})</option>
              <option value="no-record">No Record ({stats?.noRecord})</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Attendance List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              Attendance History
            </h2>
          </div>

          {filteredAttendance?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CalendarOff className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No attendance records found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAttendance?.map((record) => {
                const statusDisplay = getStatusDisplay(
                  record.status,
                  record.hasRecord,
                );
                const showOvertime =
                  record.hasRecord &&
                  record.overtimeHours != null &&
                  record.overtimeHours > 0;
                const showWorkingHours =
                  record.hasRecord &&
                  record.workingHours != null &&
                  record.workingHours > 0;
                const showLate =
                  record.hasRecord &&
                  record.lateMinutes != null &&
                  record.lateMinutes > 0;
                const showApprovalPending =
                  record.hasRecord &&
                  record.requiresApproval &&
                  record.status == "PENDING";

                return (
                  <div
                    key={record.id}
                    className={`p-4 transition-colors ${
                      isToday(record.date)
                        ? "bg-blue-50/50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}
                        >
                          {statusDisplay.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`font-semibold text-sm ${
                                isToday(record.date)
                                  ? "text-blue-700"
                                  : "text-gray-900"
                              }`}
                            >
                              {formatDate(record.date)}
                              {isToday(record.date) && (
                                <span className="ml-2 text-xs text-blue-600 font-medium">
                                  (Today)
                                </span>
                              )}
                            </span>
                            {showOvertime && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                +{record.overtimeHours!.toFixed(1)}h OT
                              </span>
                            )}
                          </div>

                          {record.hasRecord ? (
                            <>
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <ArrowDownCircle className="h-3 w-3 text-green-600" />
                                  {formatTime(record.punchIn)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <ArrowUpCircle className="h-3 w-3 text-red-600" />
                                  {formatTime(record.punchOut)}
                                </div>
                              </div>
                              {showWorkingHours && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Working: {record.workingHours!.toFixed(1)}h
                                </div>
                              )}
                              {showLate && (
                                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Late:{" "}
                                  {convertSeconds(
                                    (record?.lateMinutes ?? 0) * 60,
                                  )}
                                </div>
                              )}
                              {showApprovalPending && (
                                <div className="mt-1 text-xs text-amber-600">
                                  Awaiting approval
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-gray-400">
                              No attendance recorded
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.textColor}`}
                      >
                        {statusDisplay.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reusable Punch Modal */}
      <PunchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPunch={handlePunchComplete}
        punchType={punchType}
      />
    </div>
  );
}
