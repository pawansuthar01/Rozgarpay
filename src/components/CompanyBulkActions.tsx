"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  CheckSquare,
  Square,
  Download,
  Trash2,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  status: string;
}

interface CompanyBulkActionsProps {
  companies: Company[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBulkStatusChange: (status: string) => void;
  onBulkDelete: () => void;
  onExport: () => void;
}

export default function CompanyBulkActions({
  companies,
  selectedIds,
  onSelectionChange,
  onBulkStatusChange,
  onBulkDelete,
  onExport,
}: CompanyBulkActionsProps) {
  const [showActions, setShowActions] = useState(false);

  const handleSelectAll = () => {
    if (selectedIds.length === companies.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(companies.map((c) => c.id));
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedIds.length === 0) return;

    const confirmMessage = `Are you sure you want to ${status.toLowerCase()} ${
      selectedIds.length
    } selected companies?`;
    if (!confirm(confirmMessage)) return;

    onBulkStatusChange(status);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedIds.length} selected companies? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    onBulkDelete();
  };

  if (companies.length === 0) return null;

  return (
    <div className="bg-white p-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSelectAll}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {selectedIds.length === companies.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>
              {selectedIds.length === companies.length
                ? "Deselect All"
                : "Select All"}
            </span>
          </button>

          {selectedIds.length > 0 && (
            <span className="text-sm text-gray-600">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                <span>Bulk Actions</span>
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleBulkStatusChange("ACTIVE")}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Activate Selected
                    </button>
                    <button
                      onClick={() => handleBulkStatusChange("SUSPENDED")}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Suspend Selected
                    </button>
                    <button
                      onClick={() => handleBulkStatusChange("DEACTIVATED")}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Deactivate Selected
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleBulkDelete}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onExport}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
