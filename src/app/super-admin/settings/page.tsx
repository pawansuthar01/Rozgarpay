"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Globe,
  Shield,
  Database,
  Mail,
  Bell,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  PieChart,
  BarChart3,
  Activity,
} from "lucide-react";
import Pagination from "@/components/Pagination";

interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingsStats {
  totalSettings: number;
  platformSettings: number;
  securitySettings: number;
  notificationSettings: number;
  otherSettings: number;
  publicSettings: number;
  privateSettings: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [stats, setStats] = useState<SettingsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filter states
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, [search, categoryFilter, currentPage]);

  const fetchSettings = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        category: categoryFilter,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/settings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError("Failed to fetch settings");
      }
    } catch (error) {
      setError("An error occurred while fetching settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/super-admin/settings?limit=1000");
      if (res.ok) {
        const data = await res.json();
        const allSettings = data.settings;

        const categoryCounts = allSettings.reduce(
          (acc: any, setting: SystemSetting) => {
            acc[setting.category] = (acc[setting.category] || 0) + 1;
            return acc;
          },
          {}
        );

        const publicCount = allSettings.filter(
          (s: SystemSetting) => s.isPublic
        ).length;
        const privateCount = allSettings.filter(
          (s: SystemSetting) => !s.isPublic
        ).length;

        setStats({
          totalSettings: allSettings.length,
          platformSettings: categoryCounts.platform || 0,
          securitySettings: categoryCounts.security || 0,
          notificationSettings: categoryCounts.notification || 0,
          otherSettings:
            allSettings.length -
            (categoryCounts.platform || 0) -
            (categoryCounts.security || 0) -
            (categoryCounts.notification || 0),
          publicSettings: publicCount,
          privateSettings: privateCount,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleSaveSetting = async (settingData: any) => {
    setSaving(true);
    try {
      const method = editingSetting ? "PUT" : "POST";
      const body = editingSetting
        ? { ...settingData, id: editingSetting.id }
        : settingData;

      const res = await fetch("/api/super-admin/settings", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchSettings();
        fetchStats();
        setShowAddModal(false);
        setEditingSetting(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save setting");
      }
    } catch (error) {
      setError("An error occurred while saving setting");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSetting = async (id: string) => {
    if (!confirm("Are you sure you want to delete this setting?")) return;

    try {
      const res = await fetch(`/api/super-admin/settings?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchSettings();
        fetchStats();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete setting");
      }
    } catch (error) {
      setError("An error occurred while deleting setting");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "platform":
        return <Globe className="h-4 w-4 text-blue-600" />;
      case "security":
        return <Shield className="h-4 w-4 text-red-600" />;
      case "notification":
        return <Bell className="h-4 w-4 text-green-600" />;
      case "database":
        return <Database className="h-4 w-4 text-purple-600" />;
      default:
        return <Settings className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "platform":
        return "bg-blue-100 text-blue-800";
      case "security":
        return "bg-red-100 text-red-800";
      case "notification":
        return "bg-green-100 text-green-800";
      case "database":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryPercentage = (categoryCount: number) => {
    if (!stats || stats.totalSettings === 0) return 0;
    return Math.round((categoryCount / stats.totalSettings) * 100);
  };

  const parseSettingValue = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/super-admin/dashboard"
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ⚙️ PLATFORM SETTINGS
            </h1>
            <p className="mt-2 text-gray-600">
              Platform name, default configurations, and system settings
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/super-admin/settings/notifications"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Notification Settings
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Setting</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Settings
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalSettings}
                </p>
              </div>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Platform Settings
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.platformSettings}
                </p>
                <p className="text-xs text-gray-500">
                  {getCategoryPercentage(stats.platformSettings)}% of total
                </p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Security Settings
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.securitySettings}
                </p>
                <p className="text-xs text-gray-500">
                  {getCategoryPercentage(stats.securitySettings)}% of total
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Public Settings
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.publicSettings}
                </p>
                <p className="text-xs text-gray-500">Visible to users</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {stats && stats.totalSettings > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-blue-600" />
              Settings by Category
            </h3>
            <div className="space-y-4">
              {stats.platformSettings > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Platform
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${getCategoryPercentage(
                            stats.platformSettings
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getCategoryPercentage(stats.platformSettings)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.securitySettings > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Security
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${getCategoryPercentage(
                            stats.securitySettings
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getCategoryPercentage(stats.securitySettings)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.notificationSettings > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Notification
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${getCategoryPercentage(
                            stats.notificationSettings
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getCategoryPercentage(stats.notificationSettings)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.otherSettings > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Other
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-600 h-2 rounded-full"
                        style={{
                          width: `${getCategoryPercentage(
                            stats.otherSettings
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getCategoryPercentage(stats.otherSettings)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Public vs Private Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Visibility Distribution
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-green-600 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Public Settings
                  </span>
                </div>
                <div className="flex items-center space-x-3 flex-1 ml-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${
                          stats.totalSettings > 0
                            ? Math.round(
                                (stats.publicSettings / stats.totalSettings) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {stats.totalSettings > 0
                      ? Math.round(
                          (stats.publicSettings / stats.totalSettings) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-gray-600 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Private Settings
                  </span>
                </div>
                <div className="flex items-center space-x-3 flex-1 ml-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full"
                      style={{
                        width: `${
                          stats.totalSettings > 0
                            ? Math.round(
                                (stats.privateSettings / stats.totalSettings) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {stats.totalSettings > 0
                      ? Math.round(
                          (stats.privateSettings / stats.totalSettings) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search settings by key, description, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Categories</option>
              <option value="platform">Platform</option>
              <option value="security">Security</option>
              <option value="notification">Notification</option>
              <option value="database">Database</option>
            </select>
          </div>
        </div>
      </div>

      {/* Settings Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8">
            {/* Skeleton Loader */}
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 border border-gray-100 rounded"
                >
                  <div className="h-10 w-10 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchSettings}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : settings.length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No settings found.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              Add your first setting
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visibility
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {settings.map((setting) => (
                    <tr key={setting.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Settings className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {setting.key}
                            </div>
                            {setting.description && (
                              <div className="text-sm text-gray-500">
                                {setting.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                            setting.category
                          )}`}
                        >
                          {getCategoryIcon(setting.category)}
                          <span className="ml-1 capitalize">
                            {setting.category}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="max-w-xs truncate">
                          {typeof parseSettingValue(setting.value) === "object"
                            ? JSON.stringify(parseSettingValue(setting.value))
                            : String(parseSettingValue(setting.value))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            setting.isPublic
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {setting.isPublic ? "Public" : "Private"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(setting.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setEditingSetting(setting)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit Setting"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSetting(setting.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Setting"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Add/Edit Setting Modal */}
      {(showAddModal || editingSetting) && (
        <SettingModal
          setting={editingSetting}
          onSave={handleSaveSetting}
          onClose={() => {
            setShowAddModal(false);
            setEditingSetting(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

// Setting Modal Component
interface SettingModalProps {
  setting: SystemSetting | null;
  onSave: (data: any) => void;
  onClose: () => void;
  saving: boolean;
}

function SettingModal({ setting, onSave, onClose, saving }: SettingModalProps) {
  const [formData, setFormData] = useState({
    category: setting?.category || "platform",
    key: setting?.key || "",
    value: setting ? JSON.stringify(JSON.parse(setting.value), null, 2) : "",
    description: setting?.description || "",
    isPublic: setting?.isPublic || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedValue = JSON.parse(formData.value);
      onSave({
        ...formData,
        value: parsedValue,
      });
    } catch (error) {
      alert("Invalid JSON value");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {setting ? "Edit Setting" : "Add New Setting"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="platform">Platform</option>
              <option value="security">Security</option>
              <option value="notification">Notification</option>
              <option value="database">Database</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key
            </label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) =>
                setFormData({ ...formData, key: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value (JSON)
            </label>
            <textarea
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"example": "value"}'
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) =>
                setFormData({ ...formData, isPublic: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
              Public setting (visible to users)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : setting ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
