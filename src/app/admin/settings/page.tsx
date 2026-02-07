"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Building,
  Clock,
  IndianRupee,
  Shield,
  Edit,
  Save,
  X,
  MapPin,
  Timer,
  Settings as SettingsIcon,
  AlertTriangle,
  Loader2,
  Camera,
  Info,
  Percent,
} from "lucide-react";
import MessageModal from "@/components/MessageModal";
import {
  useCompanySettings,
  useUpdateCompanySettings,
} from "@/hooks/useCompanySettings";
import ImageUpload from "@/components/ImageUpload";
import Loading from "@/components/ui/Loading";

interface CompanySettings {
  description: string;
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
  defaultSalaryType: string;
  overtimeMultiplier: number;
  enableLatePenalty: boolean;
  latePenaltyPerMinute: number;
  enableAbsentPenalty: boolean;
  halfDayThresholdHours: number;
  absentPenaltyPerDay: number;
  pfPercentage: number;
  esiPercentage: number;
}

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const { data: companyData, isLoading, error } = useCompanySettings();
  const updateSettingsMutation = useUpdateCompanySettings();
  const queryClient = useQueryClient();

  const company = companyData?.company;
  const settings: CompanySettings = {
    description: company?.description || "",
    shiftStartTime: company?.shiftStartTime || "09:00",
    shiftEndTime: company?.shiftEndTime || "18:00",
    gracePeriodMinutes: company?.gracePeriodMinutes || 0,
    minWorkingHours: company?.minWorkingHours || 0.0,
    maxDailyHours: company?.maxDailyHours || 0.0,
    autoPunchOutBufferMinutes: company?.autoPunchOutBufferMinutes || 0,
    locationLat: company?.locationLat || undefined,
    locationLng: company?.locationLng || undefined,
    locationRadius: company?.locationRadius || 0.0,
    overtimeThresholdHours: company?.overtimeThresholdHours || 0.0,
    nightPunchInWindowHours: company?.nightPunchInWindowHours || 0.0,
    defaultSalaryType: company?.defaultSalaryType || "MONTHLY",
    overtimeMultiplier: company?.overtimeMultiplier || 1.5,
    enableLatePenalty: company?.enableLatePenalty || false,
    latePenaltyPerMinute: company?.latePenaltyPerMinute || 0,
    enableAbsentPenalty: company?.enableAbsentPenalty || false,
    halfDayThresholdHours: company?.halfDayThresholdHours || 4.0,
    absentPenaltyPerDay: company?.absentPenaltyPerDay || 0,
    pfPercentage: company?.pfPercentage || 0,
    esiPercentage: company?.esiPercentage || 0,
  };

  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [tempSettings, setTempSettings] = useState<CompanySettings>(settings);
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
    setTempSettings(settings);
  };

  const handleSave = async (section: string) => {
    setSaving(section);
    try {
      await updateSettingsMutation.mutateAsync(tempSettings);
      setEditing(null);
      setMessageModal({
        isOpen: true,
        type: "success",
        title: "Settings Saved",
        message: "Settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      setMessageModal({
        isOpen: true,
        type: "error",
        title: "Save Failed",
        message: error.message || "Failed to save settings. Please try again.",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setTempSettings(settings);
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

    queryClient.invalidateQueries({ queryKey: ["companySettings"] });
    setMessageModal({
      isOpen: true,
      type: "success",
      title: "Logo Updated",
      message: "Company logo has been updated successfully.",
    });
  };

  const handleLogoDelete = async () => {
    const response = await fetch("/api/admin/company/logo", {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete company logo");
    }

    queryClient.invalidateQueries({ queryKey: ["companySettings"] });
    setMessageModal({
      isOpen: true,
      type: "success",
      title: "Logo Deleted",
      message: "Company logo has been removed.",
    });
  };

  if (!session || session.user.role !== "ADMIN") {
    return <Loading />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton height={60} className="rounded-lg" />
          <Skeleton height={200} className="rounded-lg" />
          <Skeleton height={300} className="rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <p>Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <SettingsIcon className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Company Settings
            </h1>
          </div>
          <p className="text-gray-600 text-sm md:text-base ml-9">
            Manage your company information and all settings
          </p>
        </div>

        {/* Company Info Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-3">
            <Building className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Company Information
            </h2>
          </div>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Company Logo */}
              <div className="flex-shrink-0">
                <ImageUpload
                  currentImage={company?.logo}
                  onUpload={handleLogoUpload}
                  onDelete={handleLogoDelete}
                  type="logo"
                  size="lg"
                />
                <p className="text-center text-xs text-gray-500 mt-2">
                  Click to upload logo
                </p>
              </div>

              {/* Company Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Company Name
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {company?.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Contact super-admin to change name
                  </p>
                </div>

                {/* Description - Editable */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Description
                    </label>
                    {editing !== "description" && (
                      <button
                        onClick={() => handleEdit("description")}
                        className="text-blue-600 hover:text-blue-700 text-xs flex items-center space-x-1"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {editing === "description" ? (
                    <div className="space-y-3">
                      <textarea
                        value={tempSettings.description || ""}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter company description..."
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSave("description")}
                          disabled={saving === "description"}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                        >
                          {saving === "description" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          <span>Save</span>
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={saving === "description"}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center space-x-1"
                        >
                          <X className="h-3 w-3" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-900 text-sm">
                      {company?.description || (
                        <span className="text-gray-400 italic">
                          No description added
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shift Settings */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Shift Timings
              </h2>
            </div>
            {editing !== "shift" && (
              <button
                onClick={() => handleEdit("shift")}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>
          <div className="p-5">
            {editing === "shift" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={tempSettings.shiftStartTime || ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          shiftStartTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={tempSettings.shiftEndTime || ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          shiftEndTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grace Period (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={tempSettings.gracePeriodMinutes ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          gracePeriodMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Night Shift Window (hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="4"
                      value={tempSettings.nightPunchInWindowHours ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          nightPunchInWindowHours:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleSave("shift")}
                    disabled={saving === "shift"}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving === "shift" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Start Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.shiftStartTime}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">End Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.shiftEndTime}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Grace Period</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.gracePeriodMinutes}m
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Night Window</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.nightPunchInWindowHours}h
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Timer className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Working Hours Policy
              </h2>
            </div>
            {editing !== "hours" && (
              <button
                onClick={() => handleEdit("hours")}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>
          <div className="p-5">
            {editing === "hours" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Working Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="12"
                      value={tempSettings.minWorkingHours ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          minWorkingHours: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Daily Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={tempSettings.maxDailyHours ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          maxDailyHours: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto Punch-out Buffer (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={tempSettings.autoPunchOutBufferMinutes ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          autoPunchOutBufferMinutes:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleSave("hours")}
                    disabled={saving === "hours"}
                    className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving === "hours" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Min Hours</p>
                  <p className="text-xl font-bold text-gray-900">
                    {settings.minWorkingHours}h
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Max Hours</p>
                  <p className="text-xl font-bold text-gray-900">
                    {settings.maxDailyHours}h
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Auto Punch-out</p>
                  <p className="text-xl font-bold text-gray-900">
                    {settings.autoPunchOutBufferMinutes}m
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location Settings */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-red-600" />

              <h2 className="text-lg   font-semibold text-gray-900">
                Location Validation{" "}
                <span className="text-xs text-gray-500 font-medium">
                  (coming soon){" "}
                </span>
              </h2>
            </div>

            {editing !== "location" && (
              <button
                disabled
                onClick={() => handleEdit("location")}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>
          <div className="p-5">
            {editing === "location" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Office Latitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={tempSettings.locationLat ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          locationLat: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="e.g., 28.6139"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Office Longitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={tempSettings.locationLng ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          locationLng: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="e.g., 77.2090"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GPS Radius (meters)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={tempSettings.locationRadius ?? ""}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        locationRadius: parseFloat(e.target.value) || 100,
                      })
                    }
                    className="w-full sm:w-40 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleSave("location")}
                    disabled={saving === "location"}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving === "location" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Coordinates</p>
                  <p className="text-sm font-medium text-gray-900">
                    {settings.locationLat && settings.locationLng
                      ? `${settings.locationLat.toFixed(4)}, ${settings.locationLng.toFixed(4)}`
                      : "Not configured"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">GPS Radius</p>
                  <p className="text-lg font-bold text-gray-900">
                    {settings.locationRadius}m
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Salary Settings */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IndianRupee className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Salary Settings
              </h2>
            </div>
            {editing !== "salary" && (
              <button
                onClick={() => handleEdit("salary")}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>
          <div className="p-5">
            {editing === "salary" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Salary Type
                    </label>
                    <select
                      value={tempSettings.defaultSalaryType || "MONTHLY"}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          defaultSalaryType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="HOURLY">Hourly</option>
                      <option value="DAILY">Daily</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overtime Multiplier
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="3"
                      value={tempSettings.overtimeMultiplier ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          overtimeMultiplier: parseFloat(e.target.value) || 1.5,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., 1.5 for 1.5x overtime rate
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Half Day Threshold (hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="8"
                      value={tempSettings.halfDayThresholdHours ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          halfDayThresholdHours:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overtime Threshold (hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="8"
                      value={tempSettings.overtimeThresholdHours ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          overtimeThresholdHours:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PF Percentage
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="30"
                      value={tempSettings.pfPercentage ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          pfPercentage: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ESI Percentage
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={tempSettings.esiPercentage ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          esiPercentage: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleSave("salary")}
                    disabled={saving === "salary"}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving === "salary" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Salary Type</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {settings.defaultSalaryType?.toLowerCase() || "Monthly"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">OT Multiplier</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.overtimeMultiplier}x
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">PF %</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.pfPercentage}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">ESI %</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.esiPercentage}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Penalty Policy */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Penalty Policy
              </h2>
            </div>
            {editing !== "penalty" && (
              <button
                onClick={() => handleEdit("penalty")}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>
          <div className="p-5">
            {editing === "penalty" ? (
              <div className="space-y-4">
                {/* Late Penalty */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Late Arrival Penalty
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempSettings.enableLatePenalty}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            enableLatePenalty: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Penalty Rate (₹ per minute)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={tempSettings.latePenaltyPerMinute ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          latePenaltyPerMinute: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!tempSettings.enableLatePenalty}
                      className="w-full sm:w-40 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* Absent Penalty */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Absent Day Penalty
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempSettings.enableAbsentPenalty}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            enableAbsentPenalty: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Penalty Rate (₹ per day)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={tempSettings.absentPenaltyPerDay ?? ""}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          absentPenaltyPerDay: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!tempSettings.enableAbsentPenalty}
                      className="w-full sm:w-40 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleSave("penalty")}
                    disabled={saving === "penalty"}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving === "penalty" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">Late Penalty</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        settings.enableLatePenalty
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {settings.enableLatePenalty ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {settings.enableLatePenalty
                      ? `₹${settings.latePenaltyPerMinute}/min`
                      : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">Absent Penalty</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        settings.enableAbsentPenalty
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {settings.enableAbsentPenalty ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {settings.enableAbsentPenalty
                      ? `₹${settings.absentPenaltyPerDay}/day`
                      : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
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
