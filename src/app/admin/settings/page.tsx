"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import MessageModal from "@/components/MessageModal";

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

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
}

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [attendanceSettings, setAttendanceSettings] =
    useState<AttendanceSettings>({
      shiftStartTime: "09:00",
      shiftEndTime: "18:00",
      gracePeriodMinutes: 30,
      minWorkingHours: 4.0,
      maxDailyHours: 16.0,
      autoPunchOutBufferMinutes: 30,
      locationLat: undefined,
      locationLng: undefined,
      locationRadius: 100.0,
      overtimeThresholdHours: 2.0,
      nightPunchInWindowHours: 2.0,
    });
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch company info and settings
      const companyRes = await fetch("/api/admin/company");
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData.company);

        // Set attendance settings from company data
        setAttendanceSettings({
          shiftStartTime: companyData.company.shiftStartTime || "09:00",
          shiftEndTime: companyData.company.shiftEndTime || "18:00",
          gracePeriodMinutes: companyData.company.gracePeriodMinutes || 30,
          minWorkingHours: companyData.company.minWorkingHours || 4.0,
          maxDailyHours: companyData.company.maxDailyHours || 16.0,
          autoPunchOutBufferMinutes:
            companyData.company.autoPunchOutBufferMinutes || 30,
          locationLat: companyData.company.locationLat || undefined,
          locationLng: companyData.company.locationLng || undefined,
          locationRadius: companyData.company.locationRadius || 100.0,
          overtimeThresholdHours:
            companyData.company.overtimeThresholdHours || 2.0,
          nightPunchInWindowHours:
            companyData.company.nightPunchInWindowHours || 2.0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section: string) => {
    setEditing(section);
    setTempAttendanceSettings(attendanceSettings);
  };

  const handleSave = async (section: string) => {
    try {
      // Save attendance settings to company
      const response = await fetch("/api/admin/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempAttendanceSettings),
      });

      if (response.ok) {
        setAttendanceSettings(tempAttendanceSettings);
        setEditing(null);
        setMessageModal({
          isOpen: true,
          type: "success",
          title: "Settings Saved",
          message: "Attendance settings have been updated successfully.",
        });
      } else {
        const error = await response.json();
        setMessageModal({
          isOpen: true,
          type: "error",
          title: "Save Failed",
          message: error.error || "Failed to save settings",
        });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessageModal({
        isOpen: true,
        type: "error",
        title: "Save Failed",
        message: "Failed to save settings. Please try again.",
      });
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setTempAttendanceSettings(attendanceSettings);
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              ⚙️ Settings
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Configure attendance & payroll rules
            </p>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center">
              <Building className="h-6 w-6 mr-3 text-blue-600" />
              Company Information
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Read-only
            </span>
          </div>
          {loading ? (
            <div className="space-y-4">
              <Skeleton height={20} width={250} />
              <Skeleton height={16} width={200} />
              <Skeleton height={16} width={220} />
            </div>
          ) : company ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {company.name}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {company.email}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {company.phone}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Shift Settings */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
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
                    value={tempAttendanceSettings.shiftStartTime}
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
                    value={tempAttendanceSettings.shiftEndTime}
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
                    value={tempAttendanceSettings.gracePeriodMinutes}
                    onChange={(e) =>
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        gracePeriodMinutes: parseInt(e.target.value) || 0,
                      })
                    }
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
                    value={tempAttendanceSettings.nightPunchInWindowHours}
                    onChange={(e) =>
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        nightPunchInWindowHours:
                          parseFloat(e.target.value) || 2.0,
                      })
                    }
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
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Shift Hours
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceSettings.shiftStartTime} -{" "}
                  {attendanceSettings.shiftEndTime}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-base font-medium text-gray-700 mb-1">
                  Day Shift Grace Period
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceSettings.gracePeriodMinutes} minutes
                </p>
                <p className="text-sm text-gray-600">Late arrival allowance</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
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
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
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
                    min="1"
                    max="12"
                    value={tempAttendanceSettings.minWorkingHours}
                    onChange={(e) =>
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        minWorkingHours: parseFloat(e.target.value) || 4.0,
                      })
                    }
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
                    min="8"
                    max="24"
                    value={tempAttendanceSettings.maxDailyHours}
                    onChange={(e) =>
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        maxDailyHours: parseFloat(e.target.value) || 16.0,
                      })
                    }
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
                    value={tempAttendanceSettings.autoPunchOutBufferMinutes}
                    onChange={(e) =>
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        autoPunchOutBufferMinutes:
                          parseInt(e.target.value) || 30,
                      })
                    }
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
              <div className="bg-orange-50 rounded-lg p-4">
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
              <div className="bg-orange-50 rounded-lg p-4">
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
              <div className="bg-orange-50 rounded-lg p-4">
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
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
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
                    value={tempAttendanceSettings.locationLat || ""}
                    onChange={(e) =>
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        locationLat: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
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
                    value={tempAttendanceSettings.locationLng || ""}
                    onChange={(e) =>
                      setTempAttendanceSettings({
                        ...tempAttendanceSettings,
                        locationLng: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
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
                  value={tempAttendanceSettings.locationRadius}
                  onChange={(e) =>
                    setTempAttendanceSettings({
                      ...tempAttendanceSettings,
                      locationRadius: parseFloat(e.target.value) || 100.0,
                    })
                  }
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
              <div className="bg-red-50 rounded-lg p-4">
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
              <div className="bg-red-50 rounded-lg p-4">
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
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center">
              <DollarSign className="h-6 w-6 mr-3 text-purple-600" />
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
                  value={tempAttendanceSettings.overtimeThresholdHours}
                  onChange={(e) =>
                    setTempAttendanceSettings({
                      ...tempAttendanceSettings,
                      overtimeThresholdHours: parseFloat(e.target.value) || 2.0,
                    })
                  }
                  className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Additional hours beyond regular shift that require manager
                  approval for overtime pay (1.5x rate)
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-purple-50 rounded-lg p-6">
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
