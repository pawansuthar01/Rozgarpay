"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  PauseCircle,
  ArrowLeft,
  Users,
  IndianRupee,
  Activity,
  Edit,
  Trash2,
} from "lucide-react";

interface Admin {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    status: string;
    description: string | null;
    createdAt: string;
  } | null;
  _count: {
    attendances: number;
    salaries: number;
    approvedAttendance: number;
  };
}

export default function AdminDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.adminId as string;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchAdminDetails();
  }, [adminId]);

  const fetchAdminDetails = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/admins/${adminId}`);
      if (res.ok) {
        const data = await res.json();
        setAdmin(data.admin);
      } else {
        setError("Failed to fetch admin details");
      }
    } catch (error) {
      setError("An error occurred while fetching admin details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!admin) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/super-admin/admins/${adminId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setAdmin(data.admin);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update admin status");
      }
    } catch (error) {
      setError("An error occurred while updating admin status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "SUSPENDED":
        return "bg-red-100 text-red-800 border-red-200";
      case "DEACTIVATED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4" />;
      case "SUSPENDED":
        return <PauseCircle className="h-4 w-4" />;
      case "DEACTIVATED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getFullName = (admin: Admin) => {
    const first = admin.firstName || "";
    const last = admin.lastName || "";
    return `${first} ${last}`.trim() || "N/A";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            {/* Header skeleton */}
            <div className="bg-white p-8 rounded-lg shadow">
              <div className="flex items-center space-x-6">
                <div className="h-20 w-20 bg-gray-200 rounded-full"></div>
                <div className="space-y-3 flex-1">
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Details skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !admin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Details
              </h1>
              <Link
                href="/super-admin/admins"
                className="text-blue-600 hover:text-blue-800"
              >
                Back to Admins
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error || "Admin not found"}
            </h2>
            <p className="text-gray-600 mb-6">
              The admin you're looking for doesn't exist or has been removed.
            </p>
            <Link
              href="/super-admin/admins"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Back to Admins List
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/super-admin/admins"
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Details
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href="/super-admin/admins"
                className="text-blue-600 hover:text-blue-800"
              >
                Back to Admins
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Admin Header */}
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {getFullName(admin)}
                  </h2>
                  <p className="text-gray-600">{admin.email}</p>
                  <div className="flex items-center mt-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                        admin.status,
                      )}`}
                    >
                      {getStatusIcon(admin.status)}
                      <span className="ml-1">{admin.status}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex items-center space-x-3">
                {admin.status === "ACTIVE" ? (
                  <>
                    <button
                      onClick={() => handleStatusChange("SUSPENDED")}
                      disabled={updatingStatus}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <PauseCircle className="h-4 w-4" />
                      <span>Suspend</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange("DEACTIVATED")}
                      disabled={updatingStatus}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Deactivate</span>
                    </button>
                  </>
                ) : admin.status === "SUSPENDED" ? (
                  <>
                    <button
                      onClick={() => handleStatusChange("ACTIVE")}
                      disabled={updatingStatus}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Activate</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange("DEACTIVATED")}
                      disabled={updatingStatus}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Deactivate</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleStatusChange("ACTIVE")}
                    disabled={updatingStatus}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Activate</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Attendances
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {admin._count.attendances}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Approved Attendances
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {admin._count.approvedAttendance}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Salary Records
                  </p>
                  <p className="text-3xl font-bold text-purple-600">
                    {admin._count.salaries}
                  </p>
                </div>
                <IndianRupee className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Personal Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Full Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {getFullName(admin)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Email
                  </label>
                  <div className="mt-1 flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{admin.email}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Phone
                  </label>
                  <div className="mt-1 flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{admin.phone}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Role
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{admin.role}</p>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Company Information
              </h3>
              {admin.company ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      Company Name
                    </label>
                    <div className="mt-1 flex items-center">
                      <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-900">
                        {admin.company.name}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      Company Status
                    </label>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        admin.company.status,
                      )}`}
                    >
                      {getStatusIcon(admin.company.status)}
                      <span className="ml-1">{admin.company.status}</span>
                    </span>
                  </div>
                  {admin.company.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600">
                        Description
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {admin.company.description}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      Company Created
                    </label>
                    <div className="mt-1 flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-900">
                        {new Date(admin.company.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No company assigned</p>
                </div>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Account Created
                </label>
                <div className="mt-1 flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-900">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Last Updated
                </label>
                <div className="mt-1 flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-900">
                    {new Date(admin.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
