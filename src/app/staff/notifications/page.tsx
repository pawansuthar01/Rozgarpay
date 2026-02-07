"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  read: boolean;
  createdAt: string;
}

export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/staff/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/staff/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (response.ok) {
        setNotifications(
          notifications.map((notif) =>
            notif.id === id ? { ...notif, read: true } : notif,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const getIcon = (type: string) => {
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
      <div className="min-h-screen p-4">
        <div className=" mx-auto space-y-4">
          {/* Header Skeleton */}
          <div className="text-center py-2">
            <div className="h-7 w-40 bg-gray-200 rounded mx-auto mb-1 animate-pulse"></div>
            <div className="h-4 w-28 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>

          {/* Stats Card Skeleton */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gray-200 rounded-2xl animate-pulse"></div>
                <div className="space-y-1">
                  <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-7 w-16 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Notification List Skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse"></div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-2 w-2 bg-gray-200 rounded-full mt-2 animate-pulse"></div>
                    </div>
                    <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen p-4">
      <div className=" mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-2">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 text-sm">Stay updated with your work</p>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-2xl  p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {notifications.length} Total
                </p>
                <p className="text-sm text-gray-600">Notifications</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                  {unreadCount} Unread
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-2xl  p-8 text-center border border-gray-100">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600 text-sm">
                You'll receive updates about your work here
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-2xl  border transition-all duration-200 hover:shadow-xl ${
                  !notification.read
                    ? "border-blue-200 bg-gradient-to-r from-blue-50/50 to-white"
                    : "border-gray-100"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        notification.type === "success"
                          ? "bg-green-100"
                          : notification.type === "warning"
                            ? "bg-yellow-100"
                            : "bg-blue-100"
                      }`}
                    >
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3
                          className={`font-semibold text-gray-900 ${
                            !notification.read ? "text-blue-900" : ""
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(
                            notification.createdAt,
                          ).toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(notification.createdAt).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
