"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  XCircle,
  Minus,
  CalendarOff,
  ClockAlert,
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

interface AttendanceRecord {
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | null;
  punchIn: string | null;
  punchOut: string | null;
}

interface CalendarDay {
  date: Date;
  attendance: AttendanceRecord | null;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface ValidationData {
  valid: boolean;
  error?: string;
  punchType: "in" | "out";
  attendanceId?: string;
  lateMinutes?: number;
  isLate?: boolean;
}

export default function StaffAttendancePage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [punchType, setPunchType] = useState<"in" | "out">("in");

  const { showMessage } = useModal();
  const queryClient = useQueryClient();

  // Prefetch dashboard data for faster salary check
  useEffect(() => {
    prefetchStaffDashboard(queryClient);
  }, [queryClient]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Check salary setup - redirect if not configured
  const { data: dashboardData, isLoading: dashboardLoading } =
    useStaffDashboard();

  const { data: attendanceData = [], isLoading: attendanceLoading } =
    useStaffAttendance(year, month);
  const { data: todaysAttendance } = useTodayAttendance();
  const punchMutation = useStaffPunchAttendance();
  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      // 6 weeks * 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const attendance =
        attendanceData.find((record) => {
          const recordDate = new Date(record.date);
          return recordDate.toDateString() === date.toDateString();
        }) || null;

      days.push({
        date,
        attendance,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
      });
    }

    return days;
  };

  const getStatusDisplay = (status: string | null) => {
    switch (status) {
      case "APPROVED":
        return {
          bgColor: "bg-green-100 border-green-300",
          textColor: "text-green-800",
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          label: "Present",
        };
      case "REJECTED":
        return {
          bgColor: "bg-red-100 border-red-300",
          textColor: "text-red-800",
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          label: "Absent",
        };
      case "PENDING":
        return {
          bgColor: "bg-yellow-100 border-yellow-300",
          textColor: "text-yellow-800",
          icon: <AlertCircle className="h-4 w-4 text-yellow-600" />,
          label: "Pending",
        };
      case "LEAVE":
        return {
          bgColor: "bg-yellow-100 border-yellow-300",
          textColor: "text-yellow-800",
          icon: <CalendarOff className="h-4 w-4 text-gray-600" />,
          label: "leave",
        };
      case "ABSENT":
        return {
          bgColor: "bg-yellow-100 border-yellow-300",
          textColor: "text-red-800",
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          label: "absent",
        };
      default:
        return {
          bgColor: "bg-gray-50 border-gray-200",
          textColor: "text-gray-400",
          icon: <Minus className="h-4 w-4 text-gray-400" />,
          label: "No Record",
        };
    }
  };

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

  const calendarDays = generateCalendarDays();

  // Show loading or salary pending state
  if (
    !dashboardLoading &&
    dashboardData &&
    !dashboardData.salarySetup?.isConfigured
  ) {
    return (
      <div className=" min-h-screen">
        <div className="max-w-sm md:max-w-2xl mx-auto px-4 py-6">
          {/* Salary Pending State */}
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
      <div className=" ">
        <div className="max-w-sm md:max-w-2xl mx-auto px-2 py-3 space-y-2">
          <div className="animate-pulse space-y-2">
            <div className="h-28 bg-white/90 rounded-2xl "></div>
            <div className="h-64 bg-white/90 rounded-2xl "></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className=" ">
      <div className="max-w-sm md:max-w-2xl mx-auto px-2 py-3 space-y-2">
        {/* Header with Punch Buttons */}
        <div className="bg-white rounded-2xl  p-3">
          <div className="text-center mb-3">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Attendance</h1>
            <p className="text-gray-600 text-xs">Track your daily work hours</p>
          </div>

          {/* Punch Buttons or Status Display */}
          {todaysAttendance?.punchOut == null &&
          todaysAttendance?.status == "PENDING" ? (
            // Show only Punch Out button if session is open (punched in but not out)
            <div className="flex justify-center">
              <button
                onClick={() => handlePunchClick("out")}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200  active:scale-95 flex flex-col items-center space-y-1"
              >
                <CheckCircle className="h-5 w-5" />
                <span className="text-xs">Punch Out</span>
              </button>
            </div>
          ) : todaysAttendance ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                {getStatusDisplay(todaysAttendance.status).icon}
                <span className="text-sm font-semibold text-gray-900">
                  {getStatusDisplay(todaysAttendance.status).label}
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  Punch In:{" "}
                  {todaysAttendance.punchIn
                    ? new Date(todaysAttendance.punchIn).toLocaleTimeString()
                    : "N/A"}
                </div>
                <div>
                  Punch Out:{" "}
                  {todaysAttendance.punchOut
                    ? new Date(todaysAttendance.punchOut).toLocaleTimeString()
                    : "N/A"}
                </div>
              </div>
              {todaysAttendance.status === "APPROVED" && (
                <div className="mt-2 text-xs text-green-600 font-medium">
                  ✓ Attendance approved
                </div>
              )}
              {todaysAttendance.punchOut &&
                todaysAttendance.status !== "APPROVED" && (
                  <div className="mt-2 text-xs text-blue-600 font-medium">
                    ✓ Attendance completed for today
                  </div>
                )}
            </div>
          ) : (
            // Show Punch In button if no attendance record exists for today
            <div className="flex justify-center">
              <button
                onClick={() => handlePunchClick("in")}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200  active:scale-95 flex flex-col items-center space-y-1"
              >
                <CheckCircle className="h-5 w-5" />
                <span className="text-xs">Punch In</span>
              </button>
            </div>
          )}
        </div>

        {/* Calendar Card - Full Width */}
        <div className="bg-white rounded-2xl  p-2">
          {/* Month Navigation - Compact */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <h2 className="text-base font-bold text-gray-900">
              {currentDate.toLocaleString("default", {
                month: "short",
                year: "numeric",
              })}
            </h2>
            <button
              onClick={() => navigateMonth("next")}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Day Headers - Minimal */}
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div
                key={index}
                className="p-1 text-center text-xs font-semibold text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid - Max Width Usage */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, index) => {
              const statusDisplay = getStatusDisplay(
                day.attendance?.status || null,
              );
              return (
                <div
                  key={index}
                  className={`aspect-square rounded-md border transition-all duration-200 active:scale-95 ${
                    day.isCurrentMonth
                      ? day.isToday
                        ? "bg-blue-200 border-blue-600 shadow-sm"
                        : `${statusDisplay.bgColor} border-gray-200`
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div className="h-full flex flex-col items-center justify-center p-0.5">
                    <span
                      className={`text-xs font-bold leading-tight ${
                        day.isCurrentMonth
                          ? day.isToday
                            ? "text-blue-700"
                            : "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>

                    {day.attendance && (
                      <div className="flex flex-col items-center mt-0.5">
                        <div className="scale-50">{statusDisplay.icon}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend - Ultra Compact */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-gray-700">Present</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-yellow-600" />
              <span className="text-xs font-medium text-gray-700">Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="text-xs font-medium text-gray-700">Absent</span>
            </div>
            <div className="flex items-center space-x-1">
              <CalendarOff className="h-3 w-3 text-gray-600" />
              <span className="text-xs font-medium text-gray-700">Leave</span>
            </div>
            <div className="flex items-center space-x-1">
              <Minus className="h-3 w-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-700">
                No Record
              </span>
            </div>
          </div>
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
