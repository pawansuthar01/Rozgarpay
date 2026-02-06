"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Monitor,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  ArrowLeft,
  TrendingUp,
  PieChart,
  BarChart3,
  AlertTriangle,
  IndianRupee,
  Activity,
  Users,
  Zap,
  Send,
  Server,
} from "lucide-react";
import Pagination from "@/components/Pagination";

interface NotificationLog {
  id: string;
  type: string;
  channel: string;
  metadata: object;
  recipient: string;
  status: string;
  errorMessage: string | null;
  provider: string | null;
  messageId: string | null;
  cost: number | null;
  sentAt: string | null;
  createdAt: string;
}

interface RateLimitConfig {
  MAX_PER_HOUR: number;
  MAX_PER_DAY: number;
  COOLDOWN_SECONDS: number;
}

interface RateLimitStats {
  config: RateLimitConfig;
  hourlyLimitHits: number;
  dailyLimitHits: number;
  recentOTPCount: number;
  uniqueIdentifiers: number;
}

interface TemplateInfo {
  type: string;
  title: string;
  message: string;
  channels: string[];
  variables: string[];
}

interface APIResponse {
  notifications: NotificationLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  typeCounts: Record<string, number>;
  channelCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  providerCounts: Record<string, number>;
  costByProvider: Record<string, number>;
  allNotificationTypes: { type: string; count: number }[];
  rateLimit: RateLimitStats;
  todayStats: Record<string, number>;
  templates: TemplateInfo[];
}

export default function NotificationsPage() {
  const router = useRouter();
  const [data, setData] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Search and filter states
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [retryingNotification, setRetryingNotification] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchData();
  }, [search, typeFilter, channelFilter, statusFilter, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        type: typeFilter,
        channel: channelFilter,
        status: statusFilter,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/super-admin/notifications?${params}`);
      if (res.ok) {
        const responseData = await res.json();
        setData(responseData);
        setNotifications(responseData.notifications);
        setTotal(responseData.pagination.total);
        setTotalPages(responseData.pagination.totalPages);
      } else {
        setError("Failed to fetch notifications");
      }
    } catch (error) {
      setError("An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "email":
        return <Mail className="h-4 w-4 text-blue-600" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      case "push":
        return <Smartphone className="h-4 w-4 text-purple-600" />;
      case "in_app":
        return <Monitor className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel.toLowerCase()) {
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleRetryNotification = async (
    notificationId: string,
    notificationData: object,
  ) => {
    setRetryingNotification(notificationId);

    try {
      const res = await fetch("/api/super-admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, notificationData }),
      });

      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to retry notification");
      }
    } catch (error) {
      setError("An error occurred while retrying notification");
    } finally {
      setRetryingNotification(null);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const totalNotifications = data?.pagination.total || 0;
  const todayTotal = Object.values(data?.todayStats || {}).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="space-y-6">
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
              🔔 Notifications Dashboard
            </h1>
            <p className="mt-1 text-gray-600">
              Monitor all notification logs, rates, and delivery status
            </p>
          </div>
        </div>
        <Link
          href="/super-admin/notifications/send"
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Send className="h-4 w-4" />
          <span>Send Notification</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {["overview", "logs", "providers", "rate-limit", "templates"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.replace("-", " ")}
              </button>
            ),
          )}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Notifications
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatNumber(totalNotifications)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Bell className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formatNumber(todayTotal)} sent today
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Successfully Sent
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {formatNumber(data?.statusCounts.sent || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {calculatePercentage(
                  data?.statusCounts.sent || 0,
                  totalNotifications,
                )}
                % delivery rate
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">
                    {formatNumber(data?.statusCounts.failed || 0)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {calculatePercentage(
                  data?.statusCounts.failed || 0,
                  totalNotifications,
                )}
                % failure rate
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Rate Limit Hits
                  </p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">
                    {formatNumber(data?.rateLimit.hourlyLimitHits || 0)}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formatNumber(data?.rateLimit.dailyLimitHits || 0)} daily hits
              </p>
            </div>
          </div>

          {/* Channel Distribution & Type Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-blue-600" />
                Channel Distribution
              </h3>
              <div className="space-y-4">
                {Object.entries(data?.channelCounts || {}).map(
                  ([channel, count]) => (
                    <div
                      key={channel}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        {getChannelIcon(channel)}
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {channel.replace("_", "-")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 flex-1 ml-4">
                        <div className="flex-1 bg-gray-100 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              channel === "email"
                                ? "bg-blue-600"
                                : channel === "whatsapp"
                                  ? "bg-green-600"
                                  : channel === "push"
                                    ? "bg-purple-600"
                                    : "bg-orange-600"
                            }`}
                            style={{
                              width: `${calculatePercentage(count as number, totalNotifications)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-16 text-right font-medium">
                          {formatNumber(count as number)}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Notification Types */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                Notification Types
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {data?.allNotificationTypes
                  .sort((a, b) => b.count - a.count)
                  .map(({ type, count }) => (
                    <div
                      key={type}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Bell className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {formatNumber(count)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Today's Stats & Rate Limit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Stats */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Today's Activity
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(data?.todayStats || {}).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="text-center p-4 bg-gray-50 rounded-lg"
                    >
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(count)}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">
                        {status}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Rate Limit Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-orange-600" />
                Rate Limit Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    Max per Hour
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {data?.rateLimit.config.MAX_PER_HOUR || 3}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    Max per Day
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {data?.rateLimit.config.MAX_PER_DAY || 10}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    Cooldown
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {data?.rateLimit.config.COOLDOWN_SECONDS || 60}s
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    Unique Identifiers
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatNumber(data?.rateLimit.uniqueIdentifiers || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium text-orange-700">
                    Hourly Limit Hits
                  </span>
                  <span className="text-sm font-bold text-orange-600">
                    {formatNumber(data?.rateLimit.hourlyLimitHits || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by type, recipient, or provider..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                {data?.allNotificationTypes.map(({ type }) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Channels</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="push">Push</option>
                <option value="in_app">In-App</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Notifications Table */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                <p>{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No notifications found.</p>
                <p className="text-sm text-gray-400">
                  Notification logs will appear here when the system sends
                  notifications.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Channel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent At
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {notifications.map((notification) => (
                        <tr key={notification.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {notification.type.replace(/_/g, " ")}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {notification.id.slice(0, 8)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getChannelColor(
                                notification.channel,
                              )}`}
                            >
                              {getChannelIcon(notification.channel)}
                              <span className="ml-1 capitalize">
                                {notification.channel.replace("_", "-")}
                              </span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                notification.status,
                              )}`}
                            >
                              {getStatusIcon(notification.status)}
                              <span className="ml-1 capitalize">
                                {notification.status}
                              </span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div
                              className="max-w-xs truncate"
                              title={notification.recipient}
                            >
                              {notification.recipient}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {notification.sentAt
                              ? new Date(notification.sentAt).toLocaleString()
                              : "Not sent"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {notification.status === "failed" && (
                              <button
                                onClick={() =>
                                  handleRetryNotification(
                                    notification.id,
                                    notification,
                                  )
                                }
                                disabled={
                                  retryingNotification === notification.id
                                }
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                              >
                                {retryingNotification === notification.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                ) : (
                                  "Retry"
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Providers Tab */}
      {activeTab === "providers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(data?.providerCounts || {}).map(
              ([provider, count]) => {
                const cost = data?.costByProvider[provider] || 0;
                const isResend = provider.toLowerCase().includes("resend");
                const isMsg91 = provider.toLowerCase().includes("msg91");

                return (
                  <div
                    key={provider}
                    className={`p-6 rounded-xl shadow-sm border ${
                      isResend
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400"
                        : isMsg91
                          ? "bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400"
                          : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Server
                          className={`h-8 w-8 ${isResend || isMsg91 ? "text-white" : "text-gray-600"}`}
                        />
                        <div>
                          <p className="text-lg font-semibold capitalize">
                            {provider || "Unknown"}
                          </p>
                          <p
                            className={`text-sm ${isResend || isMsg91 ? "text-white/80" : "text-gray-500"}`}
                          >
                            Notification Provider
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p
                          className={`text-3xl font-bold ${isResend || isMsg91 ? "text-white" : "text-gray-900"}`}
                        >
                          {formatNumber(count)}
                        </p>
                        <p
                          className={`text-sm ${isResend || isMsg91 ? "text-white/80" : "text-gray-500"}`}
                        >
                          Notifications
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-3xl font-bold ${isResend || isMsg91 ? "text-white" : "text-gray-900"}`}
                        >
                          ${cost.toFixed(2)}
                        </p>
                        <p
                          className={`text-sm ${isResend || isMsg91 ? "text-white/80" : "text-gray-500"}`}
                        >
                          Total Cost
                        </p>
                      </div>
                    </div>
                    {totalNotifications > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className={
                              isResend || isMsg91
                                ? "text-white/80"
                                : "text-gray-500"
                            }
                          >
                            Share
                          </span>
                          <span
                            className={`font-medium ${isResend || isMsg91 ? "text-white" : "text-gray-900"}`}
                          >
                            {calculatePercentage(count, totalNotifications)}%
                          </span>
                        </div>
                        <div className="mt-2 bg-white/20 rounded-full h-2">
                          <div
                            className="bg-white h-2 rounded-full"
                            style={{
                              width: `${calculatePercentage(count, totalNotifications)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>

          {/* Provider Summary Table */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Provider Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Notifications
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Share
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg Cost/Notif
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(data?.providerCounts || {}).map(
                    ([provider, count]) => {
                      const cost = data?.costByProvider[provider] || 0;
                      const avgCost = count > 0 ? cost / count : 0;

                      return (
                        <tr key={provider} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <Server className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="font-medium text-gray-900 capitalize">
                                {provider || "Unknown"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                            {formatNumber(count)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                            ${cost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${calculatePercentage(count, totalNotifications)}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">
                                {calculatePercentage(count, totalNotifications)}
                                %
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                            ${avgCost.toFixed(3)}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rate Limit Tab */}
      {activeTab === "rate-limit" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Hourly Limit Hits</p>
                  <p className="text-4xl font-bold mt-2">
                    {formatNumber(data?.rateLimit.hourlyLimitHits || 0)}
                  </p>
                </div>
                <AlertTriangle className="h-12 w-12 text-orange-200" />
              </div>
              <p className="text-orange-100 mt-4 text-sm">
                Identifiers that hit hourly limit (
                {data?.rateLimit.config.MAX_PER_HOUR}/hr)
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100">Daily Limit Hits</p>
                  <p className="text-4xl font-bold mt-2">
                    {formatNumber(data?.rateLimit.dailyLimitHits || 0)}
                  </p>
                </div>
                <XCircle className="h-12 w-12 text-red-200" />
              </div>
              <p className="text-red-100 mt-4 text-sm">
                Identifiers that hit daily limit (
                {data?.rateLimit.config.MAX_PER_DAY}/day)
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total OTP Requests</p>
                  <p className="text-4xl font-bold mt-2">
                    {formatNumber(data?.rateLimit.recentOTPCount || 0)}
                  </p>
                </div>
                <Activity className="h-12 w-12 text-blue-200" />
              </div>
              <p className="text-blue-100 mt-4 text-sm">
                OTP requests in last 24 hours
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Rate Limit Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-gray-50 rounded-xl text-center">
                <Zap className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-gray-900">
                  {data?.rateLimit.config.MAX_PER_HOUR || 3}
                </p>
                <p className="text-sm text-gray-600 mt-1">Max per Hour</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl text-center">
                <Clock className="h-10 w-10 text-green-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-gray-900">
                  {data?.rateLimit.config.MAX_PER_DAY || 10}
                </p>
                <p className="text-sm text-gray-600 mt-1">Max per Day</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl text-center">
                <TimerIcon className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-gray-900">
                  {data?.rateLimit.config.COOLDOWN_SECONDS || 60}s
                </p>
                <p className="text-sm text-gray-600 mt-1">Cooldown Period</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unique Identifiers
            </h3>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Total Unique Identifiers (Phone + Email)
                </span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {formatNumber(data?.rateLimit.uniqueIdentifiers || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.templates.map((template) => (
            <div
              key={template.type}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Bell className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {template.type.replace(/_/g, " ")}
                </span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {template.title}
              </h4>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.message}
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                    Channels
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {template.channels.map((channel) => (
                      <span
                        key={channel}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getChannelColor(channel)}`}
                      >
                        {getChannelIcon(channel)}
                        <span className="ml-1 capitalize">
                          {channel.replace("_", "-")}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                    Variables
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable) => (
                      <span
                        key={variable}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
