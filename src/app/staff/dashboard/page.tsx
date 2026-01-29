"use client";

import { useState } from "react";
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
  IndianRupee,
} from "lucide-react";
import PunchModal from "@/components/PunchModal";
import { useModal } from "@/components/ModalProvider";
import {
  useStaffDashboard,
  usePunchAttendance,
} from "@/hooks/useStaffDashboard";
import { useTodayAttendance } from "@/hooks/useStaffAttendance";

export default function StaffDashboardPage() {
  const { showMessage } = useModal();
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [punchType, setPunchType] = useState<"in" | "out">("in");

  const { data: dashboardData, isLoading, error } = useStaffDashboard();
  const { data: todaysAttendance } = useTodayAttendance();
  const punchMutation = usePunchAttendance();
  const handlePunch = (type: "in" | "out") => {
    setPunchType(type);
    setPunchModalOpen(true);
  };

  const handlePunchConfirm = async (type: "in" | "out", imageData: string) => {
    setPunchModalOpen(false);
    punchMutation.mutate(
      { type, imageData },
      {
        onSuccess: () => {
          showMessage(
            "success",
            "Success",
            "Attendance recorded successfully!",
          );
        },
        onError: () => {
          showMessage(
            "error",
            "Error",
            "Failed to record attendance. Please try again.",
          );
        },
      },
    );
    return true;
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

  if (isLoading) {
    return (
      <div className="min-h-screen ">
        <div className="max-w-sm md:max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Skeleton for header */}
          <div className="animate-pulse">
            <div className="h-16 bg-white rounded-2xl  p-4 mb-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>

          {/* Skeleton for punch button */}
          <div className="animate-pulse">
            <div className="h-20 bg-white rounded-2xl "></div>
          </div>

          {/* Skeleton for dashboard options */}
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-white rounded-2xl "></div>
            <div className="h-20 bg-white rounded-2xl "></div>
            <div className="h-20 bg-white rounded-2xl "></div>
          </div>

          {/* Skeleton for notifications */}
          <div className="animate-pulse">
            <div className="h-32 bg-white rounded-2xl "></div>
          </div>

          {/* Skeleton for more actions */}
          <div className="animate-pulse">
            <div className="h-16 bg-white rounded-2xl "></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">
            Failed to load dashboard. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-sm md:max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Top Header with Company and User Info */}
        <div className="bg-white rounded-2xl  p-4">
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
        {todaysAttendance && todaysAttendance.status == "PENDING" && (
          <div className="bg-white rounded-2xl  p-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Today's Attendance
              </h2>
              <p className="text-sm text-gray-600">
                {todaysAttendance.punchIn == null
                  ? "Ready to start your day?"
                  : "Working session active"}
              </p>
            </div>

            {todaysAttendance == null ? (
              <button
                onClick={() => handlePunch("in")}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold  hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3"
              >
                <CheckCircle className="h-5 w-5" />
                <span>Punch In</span>
              </button>
            ) : (
              <button
                onClick={() => handlePunch("out")}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 px-6 rounded-xl font-semibold  hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3"
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
            className="block bg-white rounded-2xl  p-4 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
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
            className="block bg-white rounded-2xl  p-4 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-green-600" />
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
            href="/staff/salary-slips"
            className="block bg-white rounded-2xl  p-4 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
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
        <div className="bg-white rounded-2xl  p-4">
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
        <div className="bg-white rounded-2xl  p-4">
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
