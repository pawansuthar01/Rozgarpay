"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Bell,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  ChevronRight,
  Building2,
  User,
  Clock3,
  Play,
  Square,
  Camera,
} from "lucide-react";
import PunchModal from "@/components/PunchModal";

interface DashboardData {
  user: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  todayAttendance: {
    status: "not_punched" | "punched_in" | "punched_out" | "pending";
    punchInTime?: string;
    punchOutTime?: string;
    lastAttendance?: {
      date: string;
      punchIn: string;
      punchOut?: string;
      status: string;
    };
  };
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: "info" | "warning" | "success";
    createdAt: string;
  }>;
}

export default function StaffDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [punchType, setPunchType] = useState<"in" | "out">("in");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/staff/dashboard");
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = (type: "in" | "out") => {
    setPunchType(type);
    setPunchModalOpen(true);
  };

  const handlePunchConfirm = async (type: "in" | "out", imageData: string) => {
    try {
      const imageDataRes = await fetch("api/upload", {
        method: "POST",
        body: JSON.stringify({ image: imageData }),
        headers: { "Content-Type": "application/json" },
      });

      if (!imageDataRes.ok) {
        throw new Error("Image upload failed");
      }

      const { imageUrl } = await imageDataRes.json();
      const response = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, imageUrl }),
      });
      if (response.ok) {
        fetchDashboardData(); // Refresh data
        setPunchModalOpen(false);
      } else {
        throw new Error("Punch failed");
      }
    } catch (error) {
      console.error("Failed to punch:", error);
      alert("Failed to record attendance. Please try again.");
    }
  };

  const getAttendanceStatusDisplay = (status: string) => {
    switch (status) {
      case "not_punched":
        return {
          text: "Not Punched",
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          icon: <Clock3 className="h-5 w-5" />,
        };
      case "punched_in":
        return {
          text: "Punched In",
          color: "text-green-600",
          bgColor: "bg-green-50",
          icon: <Play className="h-5 w-5" />,
        };
      case "punched_out":
        return {
          text: "Punched Out",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          icon: <Square className="h-5 w-5" />,
        };
      case "pending":
        return {
          text: "Pending Approval",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          icon: <AlertCircle className="h-5 w-5" />,
        };
      default:
        return {
          text: "Unknown",
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          icon: <Clock className="h-5 w-5" />,
        };
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
          {/* Skeleton for header */}
          <div className="animate-pulse">
            <div className="h-16 bg-white rounded-2xl shadow-lg p-4 mb-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>

          {/* Skeleton for punch button */}
          <div className="animate-pulse">
            <div className="h-20 bg-white rounded-2xl shadow-lg"></div>
          </div>

          {/* Skeleton for dashboard options */}
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-white rounded-2xl shadow-lg"></div>
            <div className="h-20 bg-white rounded-2xl shadow-lg"></div>
            <div className="h-20 bg-white rounded-2xl shadow-lg"></div>
          </div>

          {/* Skeleton for notifications */}
          <div className="animate-pulse">
            <div className="h-32 bg-white rounded-2xl shadow-lg"></div>
          </div>

          {/* Skeleton for more actions */}
          <div className="animate-pulse">
            <div className="h-16 bg-white rounded-2xl shadow-lg"></div>
          </div>
        </div>

        {/* Punch Modal */}
        <PunchModal
          isOpen={punchModalOpen}
          onClose={() => setPunchModalOpen(false)}
          onPunch={handlePunchConfirm}
          punchType={punchType}
        />
      </div>
    );
  }

  const attendanceStatus = getAttendanceStatusDisplay(
    dashboardData?.todayAttendance.status || "not_punched",
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
        {/* Top Header with Company and User Info */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {dashboardData?.user.companyName || "Company"}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  Hello {dashboardData?.user.firstName || "Staff"}!
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Attendance - Show only one button */}
        {(dashboardData?.todayAttendance.status === "not_punched" ||
          dashboardData?.todayAttendance.status === "punched_in") && (
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Today's Attendance
              </h2>
              <p className="text-sm text-gray-600">
                {dashboardData?.todayAttendance.status === "not_punched"
                  ? "Ready to start your day?"
                  : "Working session active"}
              </p>
            </div>

            {dashboardData?.todayAttendance.status === "not_punched" ? (
              <button
                onClick={() => handlePunch("in")}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3"
              >
                <CheckCircle className="h-5 w-5" />
                <span>Punch In</span>
              </button>
            ) : (
              <button
                onClick={() => handlePunch("out")}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3"
              >
                <CheckCircle className="h-5 w-5" />
                <span>Punch Out</span>
              </button>
            )}
          </div>
        )}

        {/* Dashboard Options */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 px-2">
            Dashboard
          </h2>

          <Link
            href="/staff/attendance"
            className="block bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Attendance</p>
                  <p className="text-sm text-gray-600">
                    View your attendance records
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>

          <Link
            href="/staff/salary"
            className="block bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Salary Overview</p>
                  <p className="text-sm text-gray-600">
                    Check your salary details
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>

          <Link
            href="/staff/salary"
            className="block bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Salary Slip</p>
                  <p className="text-sm text-gray-600">
                    Download your salary slips
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        </div>

        {/* Today's Notifications */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Today's Notifications
            </h2>
            <Bell className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {dashboardData?.notifications &&
            dashboardData.notifications.length > 0 ? (
              dashboardData.notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No notifications today</p>
              </div>
            )}
          </div>
        </div>

        {/* More Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            More Actions
          </h2>

          <Link
            href="/staff/correction-requests"
            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
          >
            <div className="flex items-center space-x-3">
              <Plus className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Apply Leave</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Punch Modal */}
      <PunchModal
        isOpen={punchModalOpen}
        onClose={() => setPunchModalOpen(false)}
        onPunch={handlePunchConfirm}
        punchType={punchType}
      />
    </div>
  );
}
