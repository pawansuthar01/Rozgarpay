"use client";

import { useEffect, useState } from "react";
import {
  X,
  Building2,
  Users,
  Calendar,
  Clock,
  FileText,
  IndianRupee,
  User,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    attendances: number;
    salaries: number;
    reports: number;
  };
  users: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
}

interface CompanyViewModalProps {
  companyId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CompanyViewModal({
  companyId,
  isOpen,
  onClose,
}: CompanyViewModalProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (companyId && isOpen) {
      fetchCompanyDetails();
    }
  }, [companyId, isOpen]);

  const fetchCompanyDetails = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
      }
    } catch (error) {
      console.error("Failed to fetch company details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "SUSPENDED":
        return "bg-red-100 text-red-800";
      case "DEACTIVATED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Company Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading company details...</p>
          </div>
        ) : company ? (
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {company.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                        company.status,
                      )}`}
                    >
                      {company.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created:{" "}
                      {new Date(company.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      Last Updated:{" "}
                      {new Date(company.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">
                      Users
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {company._count.users}
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      Attendance
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {company._count.attendances}
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <IndianRupee className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">
                      Salaries
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {company._count.salaries}
                  </p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">
                      Reports
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900 mt-1">
                    {company._count.reports}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Users */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Users
              </h4>
              {company.users.length > 0 ? (
                <div className="space-y-2">
                  {company.users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.email}
                          </p>
                          <p className="text-sm text-gray-600">{user.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                            user.status,
                          )}`}
                        >
                          {user.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No users found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Failed to load company details
          </div>
        )}
      </div>
    </div>
  );
}
