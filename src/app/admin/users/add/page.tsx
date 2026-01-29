"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserPlus,
  Mail,
  Phone,
  User,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useCreateInvitation } from "@/hooks/useInvitations";

type Role = "MANAGER" | "ACCOUNTANT" | "STAFF";

interface FormData {
  name: string;
  email: string;
  phone: string;
  role: Role;
  sendWelcome: boolean;
}

export default function CreateUserPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const createInvitation = useCreateInvitation();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    role: "STAFF",
    sendWelcome: true,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvitation.mutate(formData, {
      onSuccess: (data) => {
        setSuccess(true);
        setInviteLink(data.inviteLink);
      },
    });
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invitation Sent!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              The invitation has been sent successfully. The user can now join
              using the link below.
            </p>
          </div>

          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Invitation Link
                </label>
                <div className="mt-1 flex">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 min-w-0 block w-full px-3 py-2 border border-gray-300 rounded-l-md text-sm bg-gray-50"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                    className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 rounded-r-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => router.push("/admin/users")}
                  className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Users
                </button>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setFormData({
                      name: "",
                      email: "",
                      phone: "",
                      role: "STAFF",
                      sendWelcome: true,
                    });
                  }}
                  className="flex-1 bg-gray-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Send Another
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/admin/users"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Invite New User
          </h1>
          <p className="mt-2 text-gray-600">
            Send an invitation to join your company
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {createInvitation.isError && createInvitation.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {createInvitation.error.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email Address *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone Number
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700"
              >
                Role *
              </label>
              <select
                name="role"
                id="role"
                required
                value={formData.role}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="STAFF">Staff</option>
                <option disabled value="ACCOUNTANT">
                  Accountant
                </option>
                <option disabled value="MANAGER">
                  Manager
                </option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select the role for this user in your company
              </p>
              <p className="mt-1 text-sm text-red-300">
                Manager and Accountant roles will be available soon.
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="sendWelcome"
                name="sendWelcome"
                type="checkbox"
                checked={formData.sendWelcome}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="sendWelcome"
                className="ml-2 block text-sm text-gray-900"
              >
                Send welcome notification after registration
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={createInvitation.isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createInvitation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Invitation...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <UserPlus className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How it works</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                1. Fill out the form with user details and select their role
                <br />
                2. We'll send an invitation link to their email
                <br />
                3. They click the link and complete registration
                <br />
                4. They'll see role-based onboarding after successful
                registration
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
