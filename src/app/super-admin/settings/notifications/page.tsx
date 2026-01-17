"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  ArrowLeft,
  PieChart,
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import Pagination from "@/components/Pagination";

interface NotificationSetting {
  id: string;
  category: string;
  key: string;
  value: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationStats {
  totalNotifications: number;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailSent: number;
  whatsappSent: number;
  pushSent: number;
  inAppSent: number;
  totalCost: number;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Channel states
  const [channels, setChannels] = useState({
    email: false,
    whatsapp: false,
    push: false,
    in_app: false,
  });

  useEffect(() => {
    fetchNotificationSettings();
    fetchStats();
  }, []);

  const fetchNotificationSettings = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "/api/super-admin/settings?category=notification&limit=100"
      );
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);

        // Parse channel settings
        const channelSettings: any = {};
        data.settings.forEach((setting: NotificationSetting) => {
          try {
            const value = JSON.parse(setting.value);
            if (typeof value === "boolean") {
              channelSettings[setting.key] = value;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        });

        setChannels({
          email: channelSettings.email_enabled || false,
          whatsapp: channelSettings.whatsapp_enabled || false,
          push: channelSettings.push_enabled || false,
          in_app: channelSettings.in_app_enabled || false,
        });
      } else {
        setError("Failed to fetch notification settings");
      }
    } catch (error) {
      setError("An error occurred while fetching notification settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/super-admin/notifications?limit=1000");
      if (res.ok) {
        const data = await res.json();
        const allNotifications = data.notifications;

        const channelCounts = allNotifications.reduce(
          (acc: any, notif: any) => {
            acc[notif.channel] = (acc[notif.channel] || 0) + 1;
            return acc;
          },
          {}
        );

        const totalCost = allNotifications
          .filter((n: any) => n.cost !== null)
          .reduce((sum: number, n: any) => sum + (n.cost || 0), 0);

        setStats({
          totalNotifications: allNotifications.length,
          emailEnabled: true, // Would be determined by settings
          whatsappEnabled: true,
          pushEnabled: true,
          inAppEnabled: true,
          emailSent: channelCounts.email || 0,
          whatsappSent: channelCounts.whatsapp || 0,
          pushSent: channelCounts.push || 0,
          inAppSent: channelCounts.in_app || 0,
          totalCost,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleChannelToggle = async (channel: string, enabled: boolean) => {
    setUpdating(channel);
    try {
      const settingKey = `${channel}_enabled`;
      const existingSetting = settings.find((s) => s.key === settingKey);

      const res = await fetch("/api/super-admin/settings", {
        method: existingSetting ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(existingSetting && { id: existingSetting.id }),
          category: "notification",
          key: settingKey,
          value: enabled,
          description: `${
            channel.charAt(0).toUpperCase() + channel.slice(1)
          } notifications ${enabled ? "enabled" : "disabled"}`,
          isPublic: false,
        }),
      });

      if (res.ok) {
        setChannels((prev) => ({ ...prev, [channel]: enabled }));
        fetchNotificationSettings(); // Refresh settings
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update channel setting");
      }
    } catch (error) {
      setError("An error occurred while updating channel setting");
    } finally {
      setUpdating(null);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-6 w-6 text-blue-600" />;
      case "whatsapp":
        return <MessageSquare className="h-6 w-6 text-green-600" />;
      case "push":
        return <Smartphone className="h-6 w-6 text-purple-600" />;
      case "in_app":
        return <Bell className="h-6 w-6 text-orange-600" />;
      default:
        return <Bell className="h-6 w-6 text-gray-600" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "email":
        return "bg-blue-100 text-blue-800";
      case "whatsapp":
        return "bg-green-100 text-green-800";
      case "push":
        return "bg-purple-100 text-purple-800";
      case "in_app":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getChannelName = (channel: string) => {
    switch (channel) {
      case "email":
        return "Email";
      case "whatsapp":
        return "WhatsApp";
      case "push":
        return "Push";
      case "in_app":
        return "In-App";
      default:
        return channel;
    }
  };

  const getChannelPercentage = (channelCount: number) => {
    if (!stats || stats.totalNotifications === 0) return 0;
    return Math.round((channelCount / stats.totalNotifications) * 100);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/super-admin/settings"
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🔔 Notification Settings
            </h1>
            <p className="mt-2 text-gray-600">
              Enable or disable notification channels (WhatsApp, Push, Email,
              In-App)
            </p>
          </div>
        </div>
      </div>

      {/* Channel Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Email Channel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                <p className="text-sm text-gray-600">SMTP notifications</p>
              </div>
            </div>
            <button
              onClick={() => handleChannelToggle("email", !channels.email)}
              disabled={updating === "email"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                channels.email ? "bg-blue-600" : "bg-gray-200"
              } ${
                updating === "email"
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  channels.email ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Status:{" "}
            <span
              className={
                channels.email
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {channels.email ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* WhatsApp Channel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  WhatsApp
                </h3>
                <p className="text-sm text-gray-600">WhatsApp Business API</p>
              </div>
            </div>
            <button
              onClick={() =>
                handleChannelToggle("whatsapp", !channels.whatsapp)
              }
              disabled={updating === "whatsapp"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                channels.whatsapp ? "bg-green-600" : "bg-gray-200"
              } ${
                updating === "whatsapp"
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  channels.whatsapp ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Status:{" "}
            <span
              className={
                channels.whatsapp
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {channels.whatsapp ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Push Channel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-8 w-8 text-purple-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Push</h3>
                <p className="text-sm text-gray-600">
                  Mobile push notifications
                </p>
              </div>
            </div>
            <button
              onClick={() => handleChannelToggle("push", !channels.push)}
              disabled={updating === "push"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                channels.push ? "bg-purple-600" : "bg-gray-200"
              } ${
                updating === "push"
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  channels.push ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Status:{" "}
            <span
              className={
                channels.push
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {channels.push ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* In-App Channel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Bell className="h-8 w-8 text-orange-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">In-App</h3>
                <p className="text-sm text-gray-600">
                  In-application notifications
                </p>
              </div>
            </div>
            <button
              onClick={() => handleChannelToggle("in_app", !channels.in_app)}
              disabled={updating === "in_app"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                channels.in_app ? "bg-orange-600" : "bg-gray-200"
              } ${
                updating === "in_app"
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  channels.in_app ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Status:{" "}
            <span
              className={
                channels.in_app
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {channels.in_app ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Notifications
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalNotifications}
                </p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Email Sent</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.emailSent}
                </p>
                <p className="text-xs text-gray-500">
                  {getChannelPercentage(stats.emailSent)}% of total
                </p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  WhatsApp Sent
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.whatsappSent}
                </p>
                <p className="text-xs text-gray-500">
                  {getChannelPercentage(stats.whatsappSent)}% of total
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${stats.totalCost.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Notification costs</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Channel Usage Charts */}
      {stats && stats.totalNotifications > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Channel Usage Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-blue-600" />
              Channel Usage Distribution
            </h3>
            <div className="space-y-4">
              {stats.emailSent > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Email
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${getChannelPercentage(stats.emailSent)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getChannelPercentage(stats.emailSent)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.whatsappSent > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      WhatsApp
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${getChannelPercentage(stats.whatsappSent)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getChannelPercentage(stats.whatsappSent)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.pushSent > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Push
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${getChannelPercentage(stats.pushSent)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getChannelPercentage(stats.pushSent)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.inAppSent > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">
                      In-App
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{
                          width: `${getChannelPercentage(stats.inAppSent)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getChannelPercentage(stats.inAppSent)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Channel Status Overview */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Channel Status Overview
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Email</span>
                </div>
                <div className="flex items-center space-x-2">
                  {channels.email ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      channels.email ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {channels.email ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">WhatsApp</span>
                </div>
                <div className="flex items-center space-x-2">
                  {channels.whatsapp ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      channels.whatsapp ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {channels.whatsapp ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-gray-900">Push</span>
                </div>
                <div className="flex items-center space-x-2">
                  {channels.push ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      channels.push ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {channels.push ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Bell className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-gray-900">In-App</span>
                </div>
                <div className="flex items-center space-x-2">
                  {channels.in_app ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      channels.in_app ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {channels.in_app ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Notification Settings */}
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
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchNotificationSettings}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : settings.length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              No notification settings configured yet.
            </p>
            <p className="text-sm text-gray-400">
              Configure notification channels above to get started.
            </p>
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
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
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
                              {setting.key
                                .replace("_", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </div>
                            {setting.description && (
                              <div className="text-sm text-gray-500">
                                {setting.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            JSON.parse(setting.value)
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {JSON.parse(setting.value) ? "Enabled" : "Disabled"}
                        </span>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
