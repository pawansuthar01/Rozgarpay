"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  LogOut,
  Edit,
} from "lucide-react";
import { useModal } from "@/components/ModalProvider";
import Loading from "@/components/ui/Loading";

interface ProfileData {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
}

export default function ManagerProfile() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showMessage } = useModal();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    setLoading(true);
    fetch("/api/manager/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setFormData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/manager/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditing(false);
        // Update session
        await update({
          name: `${updatedProfile.firstName || ""} ${updatedProfile.lastName || ""}`.trim(),
        });
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("info", "Password Not Match", "New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/manager/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        showMessage(
          "success",
          "Password Changed",
          "Password changed successfully",
        );
      } else {
        const error = await response.json();
        showMessage(
          "error",
          "Error",
          error.error || "Failed to change password",
        );
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      showMessage("error", "Error", "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!session || session.user.role !== "MANAGER") {
    return <Loading />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Profile Settings
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your account information and security settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    setFormData(profile!);
                    setEditing(false);
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-gray-900">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="text-gray-900">
                    {profile.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Failed to load profile</p>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Change Password
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      current: !showPasswords.current,
                    })
                  }
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      new: !showPasswords.new,
                    })
                  }
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      confirm: !showPasswords.confirm,
                    })
                  }
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={
                changingPassword ||
                !passwordData.currentPassword ||
                !passwordData.newPassword ||
                !passwordData.confirmPassword
              }
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Lock className="h-4 w-4 mr-2" />
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Account Actions
        </h2>
        <button
          onClick={() => signOut()}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
}
