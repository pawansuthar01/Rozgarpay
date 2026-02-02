"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState, useCallback } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { copyToClipboard, debounce } from "@/lib/utils";
import { useInvitations, useDeleteInvitation } from "@/hooks";
import { useModal } from "@/components/ModalProvider";
import {
  CheckCircle,
  Clock,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Trash2,
  Copy,
  User,
} from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  phone: string;
  role: string;
  token: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
  status: "pending" | "completed" | "expired";
}

export default function AdminInvitationsPage() {
  const { showMessage, showConfirm } = useModal();
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Debounced search function
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
      setCurrentPage(1); // Reset to first page when searching
    }, 500), // 500ms delay
    [],
  );

  // Use the custom hooks
  const {
    data: invitationsData,
    isLoading: loading,
    error: fetchError,
  } = useInvitations({
    page: currentPage,
    limit: 10,
    status: statusFilter || undefined,
    role: roleFilter || undefined,
    search: searchTerm || undefined,
  });

  const deleteInvitationMutation = useDeleteInvitation();

  // Extract data from hooks
  const invitations = invitationsData?.invitations || [];
  const stats = invitationsData?.stats || null;
  const totalPages = invitationsData?.pagination?.totalPages || 1;

  const handleDeleteInvitation = async (invitationId: string) => {
    showConfirm(
      "Confirm Delete",
      "Are you sure you want to delete this invitation? This action cannot be undone.",
      async () => {
        try {
          await deleteInvitationMutation.mutateAsync(invitationId);
        } catch (error) {
          console.error("Failed to delete invitation:", error);
          showMessage("error", "Error", "Failed to delete invitation");
        }
      },
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "expired":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses =
      "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "completed":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "expired":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getInitials = (email: string, phone: string) => {
    if (email && email.trim()) {
      return email.charAt(0).toUpperCase();
    }
    if (phone && phone.trim()) {
      return phone.charAt(0).toUpperCase();
    }
    return "?";
  };

  const getContactDisplay = (email: string, phone: string) => {
    if (email && email.trim()) {
      return email;
    }
    if (phone && phone.trim()) {
      return phone;
    }
    return "No contact info";
  };

  return (
    <div className="min-h-screen">
      <div className=" mx-auto  min-h-screen">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Invitations</h1>
          <p className="text-sm text-gray-600">Manage user invitations</p>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or phone..."
                defaultValue={searchTerm}
                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm w-full"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-3 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex-1 px-3 py-3 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Roles</option>
                <option value="STAFF">Staff</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invitations List */}
        <div className="p-4 space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton circle height={40} width={40} />
                  <div className="flex-1">
                    <Skeleton height={16} width={120} />
                    <Skeleton height={12} width={80} />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Skeleton height={14} width={60} />
                  <Skeleton height={14} width={80} />
                </div>
              </div>
            ))
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invitations found
            </div>
          ) : (
            invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {getInitials(invitation.email, invitation.phone)}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getContactDisplay(invitation.email, invitation.phone)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invitation.phone && invitation.phone.trim()
                          ? invitation.phone
                          : "No phone"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {invitation.status === "pending" && (
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `https://${process.env.NEXT_PUBLIC_NEXTAUTH_URL}/join/${invitation.token}`,
                          )
                        }
                        className="p-2 text-blue-600 hover:text-blue-900"
                        title="Copy invitation link"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    )}
                    {invitation.status === "pending" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteInvitation(invitation.id);
                        }}
                        disabled={deleteInvitationMutation.isPending}
                        className="p-2 text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete invitation"
                      >
                        {deleteInvitationMutation.isPending ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(invitation.status)}
                    <span
                      className={`text-sm ${getStatusBadge(invitation.status)}`}
                    >
                      {invitation.status}
                    </span>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invitation.role === "MANAGER"
                        ? "bg-green-100 text-green-800"
                        : invitation.role === "ACCOUNTANT"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {invitation.role}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Expires: {new Date(invitation.expiresAt).toLocaleDateString()}{" "}
                  | Created:{" "}
                  {new Date(invitation.createdAt).toLocaleDateString()}
                </div>
                {!invitation.email && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    No email
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-3 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-3 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
