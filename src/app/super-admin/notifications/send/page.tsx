"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Mail,
  MessageSquare,
  Users,
  Send,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Settings,
  Globe,
  Smartphone,
  Search,
} from "lucide-react";
import { useModal } from "@/components/ModalProvider";
import { sanitizeActionPath } from "@/lib/utils";

interface NotificationOption {
  value: string;
  label: string;
}

interface Company {
  id: string;
  name: string;
}

interface FormData {
  type: string;
  title: string;
  message: string;
  channels: string[];
  roles: string[];
  companyId: string;
  companySearch: string;
  priority: string;
}

interface ExternalFormData {
  email: string;
  phone: string;
  title: string;
  message: string;
  actionUrl: string;
  channels: string[];
  notificationType: string;
}

interface SendResult {
  userId: string;
  userName: string;
  success: boolean;
  notificationId?: string;
  errors?: string[];
}

interface ApiResponse {
  success: boolean;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  results: SendResult[];
}

interface ExternalApiResponse {
  success: boolean;
  notificationId?: string;
  message?: string;
  errors?: string[];
}

export default function SendNotificationPage() {
  const router = useRouter();
  const { showMessage } = useModal();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"bulk" | "external">("bulk");
  const [result, setResult] = useState<
    ApiResponse | ExternalApiResponse | null
  >(null);
  const [options, setOptions] = useState<{
    companies: Company[];
    userStats: Record<string, number>;
    notificationTypes: NotificationOption[];
    roles: NotificationOption[];
    channels: NotificationOption[];
    priorities: NotificationOption[];
  }>({
    companies: [],
    userStats: {},
    notificationTypes: [],
    roles: [],
    channels: [],
    priorities: [],
  });

  const [formData, setFormData] = useState<FormData>({
    type: "admin_manual",
    title: "",
    message: "",
    channels: ["in_app"],
    roles: [],
    companyId: "",
    companySearch: "",
    priority: "medium",
  });

  const [externalFormData, setExternalFormData] = useState<ExternalFormData>({
    email: "",
    phone: "",
    title: "",
    message: "",
    actionUrl: "",
    channels: ["email", "whatsapp"],
    notificationType: "system_alert",
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const response = await fetch("/api/super-admin/notifications/send");
      if (response.ok) {
        const data = await response.json();
        setOptions(data);
      }
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleExternalInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setExternalFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChannelChange = (channel: string, isExternal = false) => {
    if (isExternal) {
      setExternalFormData((prev) => {
        const channels = prev.channels.includes(channel)
          ? prev.channels.filter((c) => c !== channel)
          : [...prev.channels, channel];
        return { ...prev, channels };
      });
    } else {
      setFormData((prev) => {
        const channels = prev.channels.includes(channel)
          ? prev.channels.filter((c) => c !== channel)
          : [...prev.channels, channel];
        return { ...prev, channels };
      });
    }
  };

  const handleRoleChange = (role: string) => {
    setFormData((prev) => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/super-admin/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          message: formData.message,
          channels: formData.channels,
          role: formData.roles.length > 0 ? formData.roles : undefined,
          companyId: formData.companyId || undefined,
          priority: formData.priority,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok) {
        showMessage(
          "error",
          "ERROR",
          data.error || "Failed to send notifications",
        );
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
      showMessage(
        "error",
        "ERROR",
        "An error occurred while sending notifications",
      );
    } finally {
      setSending(false);
    }
  };

  const handleExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const result = sanitizeActionPath(externalFormData.actionUrl);
    if (!result?.isValid) {
      setResult({
        success: false,
        message: result.error,
      });
      return;
    }
    try {
      const response = await fetch("/api/super-admin/notifications/external", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: externalFormData.email || undefined,
          phone: externalFormData.phone || undefined,
          channels: externalFormData.channels,
          title: externalFormData.title,
          actionUrl: externalFormData.actionUrl,
          message: externalFormData.message,
          type: externalFormData.notificationType,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok) {
        showMessage(
          "error",
          "ERROR",
          data.errors?.join(", ") || "Failed to send notification",
        );
      }
    } catch (error) {
      console.error("Error sending external notification:", error);
      showMessage(
        "error",
        "ERROR",
        "An error occurred while sending notification",
      );
    } finally {
      setSending(false);
    }
  };

  const getEstimatedRecipients = () => {
    let count = 0;
    if (formData.roles.length > 0) {
      formData.roles.forEach((role) => {
        count += options.userStats[role] || 0;
      });
    } else {
      Object.values(options.userStats).forEach((c) => {
        count += c;
      });
    }
    return count;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/super-admin/notifications"
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📢 Send Notification
            </h1>
            <p className="mt-1 text-gray-600">
              Send notifications to users or external contacts
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: "bulk", label: "Bulk to Users", icon: Users },
            { id: "external", label: "External (Email/Phone)", icon: Globe },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "bulk" | "external")}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Result Summary */}
      {result && "success" in result && (
        <div
          className={`p-6 rounded-xl ${
            result.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-center space-x-3">
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
            <div>
              <h3
                className={`font-semibold ${
                  result.success ? "text-green-800" : "text-red-800"
                }`}
              >
                {result.success
                  ? "Notification Sent Successfully"
                  : "Failed to Send"}
              </h3>
              {"message" in result && result.message && (
                <p className="text-sm text-gray-600 mt-1">{result.message}</p>
              )}
            </div>
          </div>

          {"summary" in result && result.summary && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(result.summary.total)}
                </p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <div className="bg-white p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(result.summary.success)}
                </p>
                <p className="text-sm text-gray-500">Success</p>
              </div>
              <div className="bg-white p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(result.summary.failed)}
                </p>
                <p className="text-sm text-gray-500">Failed</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Notification Form */}
      {activeTab === "bulk" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6"
            >
              {/* Notification Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Bell className="h-4 w-4 inline mr-2" />
                  Notification Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {options.notificationTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Title and Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Settings className="h-4 w-4 inline mr-2" />
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Leave empty to use default template title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="h-4 w-4 inline mr-2" />
                  Custom Message (Optional)
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Leave empty to use default template message. You can use variables like {{userName}}, {{companyName}}, etc."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {options.priorities.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channels *
                </label>
                <div className="flex flex-wrap gap-3">
                  {options.channels.map((channel) => (
                    <label
                      key={channel.value}
                      className="flex items-center space-x-2 cursor-pointer px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.channels.includes(channel.value)}
                        onChange={() => handleChannelChange(channel.value)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {channel.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={sending || formData.channels.length === 0}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                    sending || formData.channels.length === 0
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <Send className="h-4 w-4" />
                  <span>{sending ? "Sending..." : "Send to Users"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Filter by Role
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Leave empty to select all roles
              </p>
              <div className="space-y-2">
                {options.roles.map((role) => (
                  <label
                    key={role.value}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role.value)}
                        onChange={() => handleRoleChange(role.value)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {role.label}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {formatNumber(options.userStats[role.value] || 0)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Company Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="h-4 w-4 inline mr-2" />
                Filter by Company
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="companySearch"
                  value={formData.companySearch}
                  onChange={handleInputChange}
                  placeholder="Search company..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.companySearch && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        companyId: "",
                        companySearch: "",
                      }))
                    }
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      companyId: "",
                      companySearch: "",
                    }))
                  }
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    formData.companyId === "" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  All Companies
                </button>
                {options.companies
                  .filter((company) =>
                    company.name
                      .toLowerCase()
                      .includes(formData.companySearch.toLowerCase()),
                  )
                  .map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          companyId: company.id,
                          companySearch: company.name,
                        }))
                      }
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        formData.companyId === company.id
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}
                    >
                      {company.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* Estimated Recipients */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100">Estimated Recipients</span>
                <Users className="h-5 w-5 text-blue-200" />
              </div>
              <p className="text-4xl font-bold">
                {formatNumber(getEstimatedRecipients())}
              </p>
              <p className="text-sm text-blue-100 mt-2">
                Based on selected filters
              </p>
            </div>
          </div>
        </div>
      )}

      {/* External Notification Form */}
      {activeTab === "external" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleExternalSubmit}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6"
            >
              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={externalFormData.email}
                    onChange={handleExternalInputChange}
                    placeholder="recipient@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Smartphone className="h-4 w-4 inline mr-2" />
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={externalFormData.phone}
                    onChange={handleExternalInputChange}
                    placeholder="+919999999999"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notification Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Bell className="h-4 w-4 inline mr-2" />
                  Notification Type
                </label>
                <select
                  name="notificationType"
                  value={externalFormData.notificationType}
                  onChange={handleExternalInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="system_alert">System Alert</option>
                  <option value="promotional">Promotional</option>
                  <option value="admin_manual">Admin Manual</option>
                  <option value="staff_manual">Staff Manual</option>
                  <option value="protection">Security Alert</option>
                  <option value="customer_support">Customer Support</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={externalFormData.title}
                  onChange={handleExternalInputChange}
                  placeholder="Enter notification title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="h-4 w-4 inline mr-2" />
                  Message *
                </label>
                <textarea
                  name="message"
                  value={externalFormData.message}
                  onChange={handleExternalInputChange}
                  placeholder="Enter your notification message"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action URL <span className="text-red-500">*</span>
                  <p className="text-xs text-gray-500">
                    Please enter only the end path (do not include full URL)
                  </p>
                </label>
                <input
                  type="text"
                  name="actionUrl"
                  value={externalFormData.actionUrl}
                  onChange={handleExternalInputChange}
                  placeholder="e.g. /staff/salary-setup"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              {/* Channels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channels *
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center space-x-2 cursor-pointer px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={externalFormData.channels.includes("email")}
                      onChange={() => handleChannelChange("email", true)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Email</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={externalFormData.channels.includes("whatsapp")}
                      onChange={() => handleChannelChange("whatsapp", true)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-700">WhatsApp</span>
                  </label>
                </div>
              </div>

              {/* Validation Messages */}
              {(!externalFormData.email || !externalFormData.phone) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Please enter at least an email or phone number
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={
                    sending ||
                    externalFormData.channels.length === 0 ||
                    (!externalFormData.email && !externalFormData.phone)
                  }
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                    sending ||
                    externalFormData.channels.length === 0 ||
                    (!externalFormData.email && !externalFormData.phone)
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  <Send className="h-4 w-4" />
                  <span>{sending ? "Sending..." : "Send Notification"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white">
              <h3 className="font-semibold mb-2">External Notification</h3>
              <p className="text-sm text-green-100">
                Send notifications to people who are not registered users.
                Perfect for marketing campaigns or customer outreach.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Channels
              </h3>
              <div className="space-y-2">
                {externalFormData.channels.map((channel) => (
                  <div
                    key={channel}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="capitalize flex items-center">
                      {channel === "email" ? (
                        <Mail className="h-4 w-4 mr-2 text-blue-600" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                      )}
                      {channel}
                    </span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
