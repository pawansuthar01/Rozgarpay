"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Building,
  Clock,
  DollarSign,
  Shield,
  Edit,
  Save,
  X,
  MapPin,
  Timer,
  Settings as SettingsIcon,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";
import MessageModal from "@/components/MessageModal";
import {
  useCompanySettings,
  useUpdateCompanySettings,
} from "@/hooks/useCompanySettings";
import ImageUpload from "@/components/ImageUpload";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";
import Loading from "@/components/ui/Loading";

interface AttendanceSettings {
  shiftStartTime: string;
  shiftEndTime: string;
  gracePeriodMinutes: number;
  minWorkingHours: number;
  maxDailyHours: number;
  autoPunchOutBufferMinutes: number;
  locationLat?: number;
  locationLng?: number;
  locationRadius: number;
  overtimeThresholdHours: number;
  nightPunchInWindowHours: number;
  enableLatePenalty: boolean;

  latePenaltyPerMinute: number;
  enableAbsentPenalty: boolean;
  absentPenaltyPerDay: number;
}

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const { data: companyData, isLoading, error } = useCompanySettings();
  const updateSettingsMutation = useUpdateCompanySettings();
  const queryClient = useQueryClient();

  const company = companyData?.company;
  const attendanceSettings: AttendanceSettings = {
    shiftStartTime: company?.shiftStartTime || "--:--",
    shiftEndTime: company?.shiftEndTime || "--:--",
    gracePeriodMinutes: company?.gracePeriodMinutes || 0,
    minWorkingHours: company?.minWorkingHours || 0.0,
    maxDailyHours: company?.maxDailyHours || 0.0,
    autoPunchOutBufferMinutes: company?.autoPunchOutBufferMinutes || 0,
    locationLat: company?.locationLat || undefined,
    locationLng: company?.locationLng || undefined,
    locationRadius: company?.locationRadius || 0.0,
    overtimeThresholdHours: company?.overtimeThresholdHours || 0.0,
    nightPunchInWindowHours: company?.nightPunchInWindowHours || 0.0,
    enableLatePenalty: company?.enableLatePenalty || false,
    latePenaltyPerMinute: company?.latePenaltyPerMinute || 0,
    enableAbsentPenalty: company?.enableAbsentPenalty || false,
    absentPenaltyPerDay: company?.absentPenaltyPerDay || 0,
  };

  const [editing, setEditing] = useState<string | null>(null);
  const [tempAttendanceSettings, setTempAttendanceSettings] =
    useState<AttendanceSettings>(attendanceSettings);
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

  const handleEdit = (section: string) => {
    setEditing(section);
    setTempAttendanceSettings(attendanceSettings);
  };

  const handleSave = async (section: string) => {
    try {
      await updateSettingsMutation.mutateAsync(tempAttendanceSettings);
      setEditing(null);
      setMessageModal({
        isOpen: true,
        type: "success",
        title: "Settings Saved",
        message: "Attendance settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      setMessageModal({
        isOpen: true,
        type: "error",
        title: "Save Failed",
        message: error.message || "Failed to save settings. Please try again.",
      });
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setTempAttendanceSettings(attendanceSettings);
  };

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);

    const response = await fetch("/api/admin/company/logo", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload company logo");
    }

    // Fixed BUG-006: Invalidate queries instead of full page reload
    queryClient.invalidateQueries({ queryKey: ["companySettings"] });
  };

  const handleLogoDelete = async () => {
    const response = await fetch("/api/admin/company/logo", {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete company logo");
    }

    // Fixed BUG-006: Invalidate queries instead of full page reload
    queryClient.invalidateQueries({ queryKey: ["companySettings"] });
  };

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg p-6 md:p-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Settings
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Configure attendance & payroll rules
            </p>
          </div>
        </div>

        {/* Company Info */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center">
            <Building className="h-6 w-6 mr-3 text-blue-600" />
            Company Information
          </h2>
        </div>
        <div className="bg-white gap-2  sm:flex rounded-lg p-6 md:p-8">
          {/* Company Logo */}
          <div className="mb-6 flex flex-col ">
            <h3 className="text-xm sm:text-lg  font-medium text-gray-900 mb-4 text-center">
              Company Logo
            </h3>
            <ImageUpload
              disabled
              currentImage={company?.logo}
              onUpload={handleLogoUpload}
              onDelete={handleLogoDelete}
              type="logo"
              size="md"
            />
          </div>

          {/* Company Details */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton height={20} width={250} />
              <Skeleton height={16} width={200} />
              <Skeleton height={16} width={220} />
            </div>
          ) : company ? (
            <div className="flex flex-col gap-4">
              <div className=" rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {company.name}
                </p>
              </div>

              <div className=" rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  description
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {company.description}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Shift Settings */}
        <div className="bg-white rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center">
              <Clock className="h-6 w-6 mr-3 text-green-600" />
              Shift Settings
            </h2>
            {editing === "shift" ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave("shift")}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  aria-label="Save shift settings"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  aria-label="Cancel editing"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit("shift")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                aria-label="Edit shift settings"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>

          {editing === "shift" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={tempAttendanceSettings.shiftStartTime || ""}
                    onChange={(e) =>
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        shiftStartTime: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={tempAttendanceSettings.shiftEndTime || ""}
                    onChange={(e) =>
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        shiftEndTime: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Late Arrival Grace Period (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={tempAttendanceSettings.gracePeriodMinutes ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        gracePeriodMinutes:
                          value === "" ? 0 : parseInt(value) || 0,
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Day shift: Staff can punch in up to this many minutes late
                  </p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Night Shift Punch-in Window (hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="4"
                    value={tempAttendanceSettings.nightPunchInWindowHours ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        nightPunchInWindowHours:
                          value === "" ? 0.0 : parseFloat(value) || 0.0,
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Night shift: Max hours after start time to allow punch-in
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Shift Hours
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceSettings.shiftStartTime} -{" "}
                  {attendanceSettings.shiftEndTime}
                </p>
              </div>
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Day Shift Grace Period
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceSettings.gracePeriodMinutes} minutes
                </p>
                <p className="text-sm text-gray-600">Late arrival allowance</p>
              </div>
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Night Shift Window
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceSettings.nightPunchInWindowHours}h
                </p>
                <p className="text-sm text-gray-600">Max hours to punch in</p>
              </div>
            </div>
          )}
        </div>

        {/* Working Hours Settings */}
        <div className="bg-white rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center">
              <Timer className="h-6 w-6 mr-3 text-orange-600" />
              Working Hours Policy
            </h2>
            {editing === "hours" ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave("hours")}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit("hours")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>

          {editing === "hours" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Minimum Working Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="12"
                    value={tempAttendanceSettings.minWorkingHours ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        minWorkingHours:
                          value === "" ? 0.0 : parseFloat(value) || 0.0,
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Hours required to count as working day
                  </p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Maximum Daily Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={tempAttendanceSettings.maxDailyHours ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        maxDailyHours:
                          value === "" ? 0.0 : parseFloat(value) || 0.0,
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Safety limit for daily work hours
                  </p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Auto Punch-out Buffer
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={
                      tempAttendanceSettings.autoPunchOutBufferMinutes ?? ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        autoPunchOutBufferMinutes:
                          value === "" ? 0 : parseInt(value) || 30,
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Minutes after shift end for auto punch-out
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Min Working Hours
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceSettings.minWorkingHours}h
                </p>
                <p className="text-sm text-gray-600">
                  Required to count as working day
                </p>
              </div>
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Max Daily Hours
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceSettings.maxDailyHours}h
                </p>
                <p className="text-sm text-gray-600">
                  Safety limit for work hours
                </p>
              </div>
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Auto Punch-out
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceSettings.autoPunchOutBufferMinutes}m
                </p>
                <p className="text-sm text-gray-600">Buffer after shift end</p>
              </div>
            </div>
          )}
        </div>

        {/* Location Settings */}
        <div className="bg-white rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center">
              <MapPin className="h-6 w-6 mr-3 text-red-600" />
              Location Validation
            </h2>
            {editing === "location" ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave("location")}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit("location")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>

          {editing === "location" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Office Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={tempAttendanceSettings.locationLat ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        locationLat:
                          value === "" ? undefined : parseFloat(value),
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 28.6139"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Office Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={tempAttendanceSettings.locationLng ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        locationLng:
                          value === "" ? undefined : parseFloat(value),
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 77.2090"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  GPS Validation Radius (meters)
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={tempAttendanceSettings.locationRadius ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempAttendanceSettings({
                      ...tempAttendanceSettings,
                      locationRadius:
                        value === "" ? 0.0 : parseFloat(value) || 100.0,
                    });
                  }}
                  className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Staff must be within this radius of office coordinates to
                  punch in/out
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Office Coordinates
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {attendanceSettings.locationLat &&
                  attendanceSettings.locationLng
                    ? `${attendanceSettings.locationLat.toFixed(4)}, ${attendanceSettings.locationLng.toFixed(4)}`
                    : "Not configured"}
                </p>
                <p className="text-sm text-gray-600">
                  GPS location for validation
                </p>
              </div>
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Validation Radius
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {attendanceSettings.locationRadius}m
                </p>
                <p className="text-sm text-gray-600">
                  Allowed distance from office
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Overtime Settings */}
        <div className="bg-white rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center">
              <IndianRupee className="h-6 w-6 mr-3 text-purple-600" />
              Overtime Policy
            </h2>
            {editing === "overtime" ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave("overtime")}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit("overtime")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>

          {editing === "overtime" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Overtime Approval Threshold (hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="8"
                  value={tempAttendanceSettings.overtimeThresholdHours ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempAttendanceSettings({
                      ...tempAttendanceSettings,
                      overtimeThresholdHours:
                        value === "" ? 2.0 : parseFloat(value) || 2.0,
                    });
                  }}
                  className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Additional hours beyond regular shift that require manager
                  approval for overtime pay (1.5x rate)
                </p>
              </div>
            </div>
          ) : (
            <div className=" rounded-lg p-6">
              <p className="text-base font-medium text-gray-700 mb-2">
                Overtime Approval Threshold
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {attendanceSettings.overtimeThresholdHours}h
              </p>
              <p className="text-sm text-gray-600">
                Hours worked beyond regular shift requiring approval for 1.5x
                overtime pay
              </p>
            </div>
          )}
        </div>

        {/* Penalty Settings */}
        <div className="bg-white rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-3 text-red-600" />
              Penalty Policy
            </h2>
            {editing === "penalty" ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave("penalty")}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit("penalty")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>

          {editing === "penalty" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Enable Late Arrival Penalties
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={tempAttendanceSettings.enableLatePenalty}
                      onChange={(e) =>
                        setTempAttendanceSettings({
                          ...tempAttendanceSettings,
                          enableLatePenalty: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">
                      Apply penalties for late arrivals
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Late Penalty Rate (per minute)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={tempAttendanceSettings.latePenaltyPerMinute ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        latePenaltyPerMinute:
                          value === "" ? 0 : parseFloat(value) || 0,
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={!tempAttendanceSettings.enableLatePenalty}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Amount deducted per minute of lateness
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Enable Absent Day Penalties
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={tempAttendanceSettings.enableAbsentPenalty}
                      onChange={(e) =>
                        setTempAttendanceSettings({
                          ...tempAttendanceSettings,
                          enableAbsentPenalty: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">
                      Apply penalties for absent days
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Absent Penalty Rate (per day)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1000"
                    value={tempAttendanceSettings.absentPenaltyPerDay ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        absentPenaltyPerDay:
                          value === "" ? 0 : parseFloat(value) || 0,
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={!tempAttendanceSettings.enableAbsentPenalty}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Amount deducted for each absent day
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Late Arrival Penalties
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceSettings.enableLatePenalty
                    ? "Enabled"
                    : "Disabled"}
                </p>
                <p className="text-sm text-gray-600">
                  {attendanceSettings.enableLatePenalty
                    ? `₹${attendanceSettings.latePenaltyPerMinute}/minute`
                    : "No penalties applied"}
                </p>
              </div>
              <div className=" rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Absent Day Penalties
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceSettings.enableAbsentPenalty
                    ? "Enabled"
                    : "Disabled"}
                </p>
                <p className="text-sm text-gray-600">
                  {attendanceSettings.enableAbsentPenalty
                    ? `₹${attendanceSettings.absentPenaltyPerDay}/day`
                    : "No penalties applied"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Message Modal */}
        <MessageModal
          isOpen={messageModal.isOpen}
          onClose={() =>
            setMessageModal((prev) => ({ ...prev, isOpen: false }))
          }
          type={messageModal.type}
          title={messageModal.title}
          message={messageModal.message}
        />
      </div>
    </div>
  );
}
