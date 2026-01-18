"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  XCircle,
  Minus,
  Moon,
  Clock,
} from "lucide-react";
import PunchModal from "@/components/PunchModal";
import MessageModal from "@/components/MessageModal";
import {
  getAttendanceBaseDate,
  getAttendanceDateForShift,
} from "@/lib/attendanceUtils";
import { get } from "http";
import { getLocalDateString } from "@/lib/utils";

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

interface CompanySettings {
  shiftStartTime: string;
  shiftEndTime: string;
  minWorkingHours: number;
  maxDailyHours: number;
}

export default function StaffAttendancePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [punchType, setPunchType] = useState<"in" | "out">("in");
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [todaysAttendance, setTodaysAttendance] =
    useState<AttendanceRecord | null>(null);
  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  useEffect(() => {
    fetchAttendance();
    getTodayAttendance();
  }, [currentDate]);
  async function getTodayAttendance() {
    const response = await fetch("/api/attendance/today");
    if (!response.ok) throw new Error("Failed to fetch today's attendance");
    const data = await response.json();
    console.log(data);
    return data.attendance;
  }

  const fetchAttendance = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JS months are 0-indexed

      // Fetch attendance data
      const attendanceResponse = await fetch(
        `/api/staff/attendance?year=${year}&month=${month}`,
      );

      if (!attendanceResponse.ok) throw new Error("Attendance fetch failed");
      const data: AttendanceRecord[] = await attendanceResponse.json();
      setAttendanceData(data);
      const todayBase = getLocalDateString(new Date()).split("T")[0];
      console.log(todayBase);
      const todayRecord =
        data.find((record) => {
          const recordDate = new Date(record.date);
          const recordBase = getLocalDateString(recordDate).split("T")[0];
          return recordBase === todayBase;
        }) || null;

      const openSessionExists = data.some((r) => r.punchIn && !r.punchOut);
      // Set todaysAttendance if any attendance record exists for today
      // This ensures status is shown instead of punch buttons when attendance exists (pending/approved/rejected)
      setTodaysAttendance(todayRecord);
      setHasOpenSession(openSessionExists);
      // Fetch company settings for shift information
      const settingsResponse = await fetch("/api/staff/company");

      if (settingsResponse.ok) {
        const { company } = await settingsResponse.json();
        if (company) {
          setCompanySettings({
            shiftStartTime: company.shiftStartTime || "09:00",
            shiftEndTime: company.shiftEndTime || "18:00",
            minWorkingHours: company.minWorkingHours || 4.0,
            maxDailyHours: company.maxDailyHours || 16.0,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
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

  // Helper function to check if current shift is night shift
  const isCurrentShiftNightShift = () => {
    if (!companySettings) return false;
    const startMinutes = timeToMinutes(companySettings.shiftStartTime);
    const endMinutes = timeToMinutes(companySettings.shiftEndTime);
    return endMinutes < startMinutes;
  };

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Get current attendance date for night shifts
  const getCurrentAttendanceDate = () => {
    if (!companySettings) return new Date();

    const now = new Date();
    if (isCurrentShiftNightShift()) {
      // For night shifts, attendance belongs to the date when shift starts
      const shiftStartTime = new Date(now);
      const [startHours, startMinutes] = companySettings.shiftStartTime
        .split(":")
        .map(Number);
      shiftStartTime.setHours(startHours, startMinutes, 0, 0);

      // If current time is before shift start, use yesterday's date
      const attendanceDate = new Date(now);
      if (now < shiftStartTime) {
        attendanceDate.setDate(attendanceDate.getDate() - 1);
      }
      return attendanceDate;
    }
    return now;
  };

  const handlePunchClick = (type: "in" | "out") => {
    setPunchType(type);
    setModalOpen(true);
  };

  const handlePunchComplete = async (type: "in" | "out", imageData: string) => {
    try {
      // Then perform the punch operation
      const imageDataRes = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ image: imageData }),
        headers: { "Content-Type": "application/json" },
      });
      if (!imageDataRes.ok) {
        throw new Error("Image upload failed");
      }

      const { imageUrl } = await imageDataRes.json();

      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      const result = await res.json();
      if (result.success) {
        await fetchAttendance();
        setMessageModal({
          isOpen: true,
          type: "success",
          title: "Success!",
          message: `Successfully punched ${type === "in" ? "in" : "out"}!`,
        });
      } else {
        // Provide human-friendly error messages
        let errorMessage = result.error || "Failed to complete punch";
        let errorTitle = "Punch Failed";

        if (result.error?.includes("Approved attendance cannot be updated")) {
          errorTitle = "Attendance Already Approved";
          errorMessage =
            "Your attendance for today is already approved. Please contact your manager for changes.";
        } else if (result.error?.includes("already have an open attendance")) {
          // This error should only appear for punch-in attempts
          if (type === "in") {
            errorTitle = "Already Punched In";
            errorMessage =
              "You already have an active attendance session. Please punch out first.";
          } else {
            // For punch-out, this shouldn't happen with proper UI
            errorTitle = "Session Error";
            errorMessage =
              "There seems to be an issue with your attendance session.";
          }
        } else if (result.error?.includes("already been punched out")) {
          errorTitle = "Already Punched Out";
          errorMessage =
            "This attendance session has already been punched out.";
        } else if (result.error?.includes("Location validation failed")) {
          errorTitle = "Location Required";
          errorMessage =
            "Please ensure you are at the company premises and enable GPS.";
        } else if (result.error?.includes("Late punch-in")) {
          errorTitle = "Late Punch-In";
          errorMessage = result.error;
        }

        setMessageModal({
          isOpen: true,
          type: "error",
          title: errorTitle,
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error("Error during punch process:", error);
      setMessageModal({
        isOpen: true,
        type: "error",
        title: "Upload Failed",
        message:
          "Failed to upload photo. Please check your connection and try again.",
      });
    }
  };

  const calendarDays = generateCalendarDays();

  if (loading) {
    return (
      <div className=" bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-sm mx-auto px-2 py-3 space-y-2">
          <div className="animate-pulse space-y-2">
            <div className="h-28 bg-white rounded-2xl shadow-lg"></div>
            <div className="h-64 bg-white rounded-2xl shadow-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className=" bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-sm mx-auto px-2 py-3 space-y-2">
        {/* Night Shift Banner */}
        {companySettings && isCurrentShiftNightShift() && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg p-3 mb-2">
            <div className="flex items-center space-x-2 mb-1">
              <Moon className="h-4 w-4" />
              <span className="text-sm font-semibold">
                🌙 Night Shift Active
              </span>
            </div>
            <div className="text-xs opacity-90">
              <div>
                Shift: {companySettings.shiftStartTime} –{" "}
                {companySettings.shiftEndTime}
              </div>
              <div>
                Attendance Date:{" "}
                {getCurrentAttendanceDate().toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {/* Header with Punch Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-3">
          <div className="text-center mb-3">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Attendance</h1>
            <p className="text-gray-600 text-xs">
              {companySettings && isCurrentShiftNightShift()
                ? "Night shift schedule active"
                : "Track your daily work hours"}
            </p>
          </div>

          {/* Punch Buttons or Status Display */}
          {hasOpenSession ? (
            // Show only Punch Out button if session is open (punched in but not out)
            <div className="flex justify-center">
              <button
                onClick={() => handlePunchClick("out")}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg active:scale-95 flex flex-col items-center space-y-1"
              >
                <CheckCircle className="h-5 w-5" />
                <span className="text-xs">
                  {companySettings && isCurrentShiftNightShift()
                    ? "Punch Out (Night)"
                    : "Punch Out"}
                </span>
                {companySettings &&
                  isCurrentShiftNightShift() &&
                  companySettings.shiftEndTime && (
                    <span className="text-xs opacity-80">
                      Ends {companySettings.shiftEndTime}
                    </span>
                  )}
              </button>
            </div>
          ) : todaysAttendance ? (
            // Show today's attendance status if any attendance record exists for today
            // This includes approved, pending, rejected, or completed attendance
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
                className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg active:scale-95 flex flex-col items-center space-y-1"
              >
                <CheckCircle className="h-5 w-5" />
                <span className="text-xs">
                  {companySettings && isCurrentShiftNightShift()
                    ? "Punch In (Night)"
                    : "Punch In"}
                </span>
                {companySettings && isCurrentShiftNightShift() && (
                  <span className="text-xs opacity-80">
                    {getCurrentAttendanceDate().toLocaleDateString()}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Calendar Card - Full Width */}
        <div className="bg-white rounded-2xl shadow-lg p-2">
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
                        ? "bg-blue-100 border-blue-300 shadow-sm"
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

      {/* Message Modal */}
      <MessageModal
        isOpen={messageModal.isOpen}
        onClose={() => setMessageModal((prev) => ({ ...prev, isOpen: false }))}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
      />
    </div>
  );
}
