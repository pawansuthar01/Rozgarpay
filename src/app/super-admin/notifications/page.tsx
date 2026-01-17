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
  DollarSign,
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

interface NotificationStats {
  totalNotifications: number;
  sentNotifications: number;
  failedNotifications: number;
  pendingNotifications: number;
  emailNotifications: number;
  whatsappNotifications: number;
  pushNotifications: number;
  inAppNotifications: number;
  totalCost: number;
  avgDeliveryTime: number;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [retryingNotification, setRetryingNotification] = useState<
    string | null
  >(null);

  // Search and filter states
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [search, typeFilter, channelFilter, statusFilter, currentPage]);

  const fetchNotifications = async () => {
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
        const data = await res.json();
        setNotifications(data.notifications);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError("Failed to fetch notifications");
      }
    } catch (error) {
      setError("An error occurred while fetching notifications");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsError("");
    try {
      const res = await fetch("/api/super-admin/notifications?limit=1000");
      if (res.ok) {
        const data = await res.json();
        const allNotifications = data.notifications;

        const channelCounts = allNotifications.reduce(
          (acc: any, notif: NotificationLog) => {
            acc[notif.channel] = (acc[notif.channel] || 0) + 1;
            return acc;
          },
          {}
        );

        const statusCounts = allNotifications.reduce(
          (acc: any, notif: NotificationLog) => {
            acc[notif.status] = (acc[notif.status] || 0) + 1;
            return acc;
          },
          {}
        );

        const totalCost = allNotifications
          .filter((n: NotificationLog) => n.cost !== null)
          .reduce((sum: number, n: NotificationLog) => sum + (n.cost || 0), 0);

        // Calculate average delivery time for sent notifications
        const sentNotifications = allNotifications.filter(
          (n: NotificationLog) => n.sentAt
        );
        const avgDeliveryTime =
          sentNotifications.length > 0
            ? sentNotifications.reduce((sum: number, n: NotificationLog) => {
                const created = new Date(n.createdAt).getTime();
                const sent = new Date(n.sentAt!).getTime();
                return sum + (sent - created);
              }, 0) /
              sentNotifications.length /
              1000 /
              60 // Convert to minutes
            : 0;

        setStats({
          totalNotifications: allNotifications.length,
          sentNotifications: statusCounts.sent || 0,
          failedNotifications: statusCounts.failed || 0,
          pendingNotifications: statusCounts.pending || 0,
          emailNotifications: channelCounts.email || 0,
          whatsappNotifications: channelCounts.whatsapp || 0,
          pushNotifications: channelCounts.push || 0,
          inAppNotifications: channelCounts.in_app || 0,
          totalCost,
          avgDeliveryTime: Math.round(avgDeliveryTime * 100) / 100,
        });
      } else {
        setStatsError("Failed to fetch notification statistics");
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setStatsError("An error occurred while fetching statistics");
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

  const getChannelPercentage = (channelCount: number) => {
    if (!stats || stats.totalNotifications === 0) return 0;
    return Math.round((channelCount / stats.totalNotifications) * 100);
  };

  const handleRetry = async () => {
    setRetrying(true);
    setError("");
    setStatsError("");

    try {
      await Promise.all([fetchNotifications(), fetchStats()]);
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setRetrying(false);
    }
  };

  const handleRetryNotification = async (
    notificationId: string,
    notificationData: object
  ) => {
    setRetryingNotification(notificationId);

    try {
      const res = await fetch("/api/super-admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, notificationData }),
      });

      if (res.ok) {
        // Refresh the notifications list
        await fetchNotifications();
        await fetchStats();
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

  const getStatusPercentage = (statusCount: number) => {
    if (!stats || stats.totalNotifications === 0) return 0;
    return Math.round((statusCount / stats.totalNotifications) * 100);
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
              🔔 NOTIFICATIONS (MONITORING)
            </h1>
            <p className="mt-2 text-gray-600">
              System notifications log and delivery monitoring
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {statsError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <XCircle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Failed to load statistics
                </h3>
                <p className="text-sm text-red-700 mt-1">{statsError}</p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <span>{retrying ? "Retrying..." : "Try Again"}</span>
            </button>
          </div>
        </div>
      ) : stats ? (
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
                <p className="text-sm font-medium text-gray-600">
                  Successfully Sent
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.sentNotifications}
                </p>
                <p className="text-xs text-gray-500">
                  {getStatusPercentage(stats.sentNotifications)}% success rate
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Failed Deliveries
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.failedNotifications}
                </p>
                <p className="text-xs text-gray-500">
                  {getStatusPercentage(stats.failedNotifications)}% failure rate
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${stats.totalCost.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  Avg: $
                  {(stats.totalNotifications > 0
                    ? stats.totalCost / stats.totalNotifications
                    : 0
                  ).toFixed(3)}
                  /notification
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Charts Section */}
      {stats && stats.totalNotifications > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Channel Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-blue-600" />
              Channel Distribution
            </h3>
            <div className="space-y-4">
              {stats.emailNotifications > 0 && (
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
                          width: `${getChannelPercentage(
                            stats.emailNotifications
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getChannelPercentage(stats.emailNotifications)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.whatsappNotifications > 0 && (
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
                          width: `${getChannelPercentage(
                            stats.whatsappNotifications
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getChannelPercentage(stats.whatsappNotifications)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.pushNotifications > 0 && (
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
                          width: `${getChannelPercentage(
                            stats.pushNotifications
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getChannelPercentage(stats.pushNotifications)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.inAppNotifications > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Monitor className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">
                      In-App
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{
                          width: `${getChannelPercentage(
                            stats.inAppNotifications
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {getChannelPercentage(stats.inAppNotifications)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Delivery Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Sent
                  </span>
                </div>
                <div className="flex items-center space-x-3 flex-1 ml-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${getStatusPercentage(
                          stats.sentNotifications
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {getStatusPercentage(stats.sentNotifications)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Pending
                  </span>
                </div>
                <div className="flex items-center space-x-3 flex-1 ml-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{
                        width: `${getStatusPercentage(
                          stats.pendingNotifications
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {getStatusPercentage(stats.pendingNotifications)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Failed
                  </span>
                </div>
                <div className="flex items-center space-x-3 flex-1 ml-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{
                        width: `${getStatusPercentage(
                          stats.failedNotifications
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {getStatusPercentage(stats.failedNotifications)}%
                  </span>
                </div>
              </div>

              {stats.avgDeliveryTime > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      Average Delivery Time
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {stats.avgDeliveryTime} min
                    </span>
                  </div>
                </div>
              )}
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
                placeholder="Search notifications by type, recipient, or provider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Types</option>
              <option value="invitation">Invitation</option>
              <option value="notification">Notification</option>
              <option value="alert">Alert</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Channels</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="push">Push</option>
              <option value="in_app">In-App</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
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
              onClick={fetchNotifications}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No notifications found.</p>
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
                      Notification
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
                      metaData
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
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
                        <div className="flex items-center">
                          <Bell className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {notification.type}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {notification.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getChannelColor(
                            notification.channel
                          )}`}
                        >
                          {getChannelIcon(notification.channel)}
                          <span className="ml-1 capitalize">
                            {notification.channel}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            notification.status
                          )}`}
                        >
                          {getStatusIcon(notification.status)}
                          <span className="ml-1 capitalize">
                            {notification.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="max-w-xs truncate">
                          {notification.recipient}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <pre className="max-w-lg max-h-40  overflow-auto scrollbar-hide rounded bg-gray-100 p-3 text-xs">
                          {JSON.stringify(notification.metadata, null, 2)}
                        </pre>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {notification.provider || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {notification.cost !== null
                          ? `$${notification.cost.toFixed(3)}`
                          : "N/A"}
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
                                notification
                              )
                            }
                            disabled={retryingNotification === notification.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Retry sending this notification"
                          >
                            {retryingNotification === notification.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              "Try Again"
                            )}
                          </button>
                        )}
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
    </div>
  );
}
