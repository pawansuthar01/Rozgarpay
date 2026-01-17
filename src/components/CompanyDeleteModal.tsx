"use client";

import { useState } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";

interface Company {
  id: string;
  name: string;
  _count?: {
    users: number;
    attendances: number;
    salaries: number;
    reports: number;
  };
}

interface CompanyDeleteModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CompanyDeleteModal({
  company,
  isOpen,
  onClose,
  onConfirm,
}: CompanyDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!company) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/companies/${company.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onConfirm();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete company");
      }
    } catch (error) {
      setError("An error occurred while deleting the company");
    } finally {
      setLoading(false);
    }
  };

  const hasData =
    company?._count &&
    (company._count.users > 0 ||
      company._count.attendances > 0 ||
      company._count.salaries > 0 ||
      company._count.reports > 0);

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Delete Company</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start space-x-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Are you sure you want to delete "{company.name}"?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This action cannot be undone. This will permanently delete the
                company and remove all associated data from our servers.
              </p>

              {hasData && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-red-800 font-medium mb-2">
                    Warning: This company has existing data
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {company._count!.users > 0 && (
                      <li>• {company._count!.users} users</li>
                    )}
                    {company._count!.attendances > 0 && (
                      <li>
                        • {company._count!.attendances} attendance records
                      </li>
                    )}
                    {company._count!.salaries > 0 && (
                      <li>• {company._count!.salaries} salary records</li>
                    )}
                    {company._count!.reports > 0 && (
                      <li>• {company._count!.reports} reports</li>
                    )}
                  </ul>
                  <p className="text-sm text-red-800 mt-2">
                    Companies with existing data cannot be deleted. Please
                    deactivate instead.
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || hasData}
              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>{loading ? "Deleting..." : "Delete Company"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
