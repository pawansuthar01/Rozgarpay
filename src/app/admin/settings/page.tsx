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
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Settings {
  workingHoursStart: string;
  workingHoursEnd: string;
  salaryType: string;
  attendanceRules: string;
}

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<Settings>({
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    salaryType: "MONTHLY",
    attendanceRules: "Standard 9-5 working hours",
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [tempSettings, setTempSettings] = useState<Settings>(settings);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch company info
      const companyRes = await fetch("/api/admin/company");
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData.company);
      }

      // Fetch settings (placeholder)
      // In a real app, this would fetch from a settings API
      setSettings({
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
        salaryType: "MONTHLY",
        attendanceRules: "Standard 9-5 working hours with 1 hour lunch break",
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section: string) => {
    setEditing(section);
    setTempSettings(settings);
  };

  const handleSave = async (section: string) => {
    try {
      // Save settings (placeholder)
      setSettings(tempSettings);
      setEditing(null);
      alert("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setTempSettings(settings);
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            ⚙️ SETTINGS
          </h1>
          <p className="mt-2 text-gray-600">
            Manage company settings and preferences
          </p>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Company Information
          </h2>
          <span className="text-sm text-gray-500">Read-only</span>
        </div>
        {loading ? (
          <div className="space-y-4">
            <Skeleton height={20} width={200} />
            <Skeleton height={16} width={150} />
            <Skeleton height={16} width={180} />
            <Skeleton height={16} width={160} />
          </div>
        ) : company ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Company Name</p>
              <p className="text-sm text-gray-900">{company.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-sm text-gray-900">{company.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Phone</p>
              <p className="text-sm text-gray-900">{company.phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Address</p>
              <p className="text-sm text-gray-900">{company.address}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Working Hours */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Working Hours
          </h2>
          {editing === "workingHours" ? (
            <div className="flex space-x-2">
              <button
                onClick={() => handleSave("workingHours")}
                className="p-1 text-green-600 hover:text-green-800"
                aria-label="Save working hours"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-red-600 hover:text-red-800"
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleEdit("workingHours")}
              className="p-1 text-gray-600 hover:text-gray-800"
              aria-label="Edit working hours"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
        {editing === "workingHours" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={tempSettings.workingHoursStart}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    workingHoursStart: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={tempSettings.workingHoursEnd}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    workingHoursEnd: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-900">
            {settings.workingHoursStart} - {settings.workingHoursEnd}
          </p>
        )}
      </div>

      {/* Salary Type */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Default Salary Type
          </h2>
          {editing === "salaryType" ? (
            <div className="flex space-x-2">
              <button
                onClick={() => handleSave("salaryType")}
                className="p-1 text-green-600 hover:text-green-800"
                aria-label="Save salary type"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-red-600 hover:text-red-800"
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleEdit("salaryType")}
              className="p-1 text-gray-600 hover:text-gray-800"
              aria-label="Edit salary type"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
        {editing === "salaryType" ? (
          <select
            value={tempSettings.salaryType}
            onChange={(e) =>
              setTempSettings({ ...tempSettings, salaryType: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
            <option value="DAILY">Daily</option>
          </select>
        ) : (
          <p className="text-sm text-gray-900">{settings.salaryType}</p>
        )}
      </div>

      {/* Attendance Rules */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Attendance Rules
          </h2>
          {editing === "attendanceRules" ? (
            <div className="flex space-x-2">
              <button
                onClick={() => handleSave("attendanceRules")}
                className="p-1 text-green-600 hover:text-green-800"
                aria-label="Save attendance rules"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-red-600 hover:text-red-800"
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleEdit("attendanceRules")}
              className="p-1 text-gray-600 hover:text-gray-800"
              aria-label="Edit attendance rules"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
        {editing === "attendanceRules" ? (
          <textarea
            value={tempSettings.attendanceRules}
            onChange={(e) =>
              setTempSettings({
                ...tempSettings,
                attendanceRules: e.target.value,
              })
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter attendance rules..."
          />
        ) : (
          <p className="text-sm text-gray-900">{settings.attendanceRules}</p>
        )}
      </div>
    </div>
  );
}
