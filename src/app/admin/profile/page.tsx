"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { User, Mail, Phone, Lock, LogOut, Edit, Save, X } from "lucide-react";
import {
  useProfile,
  useUpdateProfile,
  useUpdatePassword,
  useUpdateProfileImage,
  useDeleteProfileImage,
} from "@/hooks";
import ImageUpload from "@/components/ImageUpload";
import { useModal } from "@/components/ModalProvider";
import { User as UserType } from "next-auth";

export default function AdminProfilePage() {
  const { data: session, update, status } = useSession();
  const { showMessage } = useModal();

  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [iLoading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  useEffect(() => {
    if (status == "authenticated") {
      setUser(session?.user);
    }
    setLoading(status == "loading");
  }, [session?.user, status]);
  const updateProfileMutation = useUpdateProfile();
  const updatePasswordMutation = useUpdatePassword();
  const updateProfileImageMutation = useUpdateProfileImage();
  const deleteProfileImageMutation = useDeleteProfileImage();

  const handleProfileImageUpload = async (file: File) => {
    const ProfileRes = await updateProfileImageMutation.mutateAsync(file);
    if (ProfileRes) {
      const { profileImgUrl: profileImg } = ProfileRes;
      await update({ profileImg });
    }
  };

  const handleProfileImageDelete = async () => {
    await deleteProfileImageMutation.mutateAsync();
    await update({
      profileImg: null,
      firstName: user?.firstName,
      lastName: user?.lastName,
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const ProfileRes = await updateProfileMutation.mutateAsync({
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      });
      if (ProfileRes) {
        const { firstName, lastName } = ProfileRes;
        await update({ firstName, lastName, profileImg: user.profileImg });
      }
      setEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      showMessage("error", "Error", "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("error", "Error", "New passwords do not match");
      return;
    }

    try {
      await updatePasswordMutation.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showMessage("success", "Success", "Password changed successfully");
    } catch (error) {
      console.error("Failed to change password:", error);
      showMessage("error", "Error", "Failed to change password");
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            👤 Profile
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your admin profile and account settings
          </p>
        </div>
      </div>

      {/* Profile Details */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Admin Details
          </h2>

          {editing ? (
            <div className="flex space-x-2">
              <button
                onClick={handleSaveProfile}
                className="p-1 text-green-600 hover:text-green-800"
                aria-label="Save profile"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                }}
                className="p-1 text-red-600 hover:text-red-800"
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-gray-600 hover:text-gray-800"
              aria-label="Edit profile"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-col items-center md:flex-row md:items-start gap-4">
          <ImageUpload
            disabled={!editing}
            currentImage={user?.profileImg}
            onUpload={handleProfileImageUpload}
            onDelete={handleProfileImageDelete}
            type="profile"
            size="sm"
          />
          {iLoading ? (
            <div className="w-full space-y-4">
              <Skeleton height={20} width={200} />
              <Skeleton height={16} width={150} />
              <Skeleton height={16} width={180} />
            </div>
          ) : editing && user ? (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={user.firstName || ""}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      firstName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={user.lastName || ""}
                  onChange={(e) =>
                    setUser({ ...user, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : user ? (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-500">Full Name</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.email}
                  </p>
                  <p className="text-sm text-gray-500">Email Address</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.phone || "Not provided"}
                  </p>
                  <p className="text-sm text-gray-500">Phone Number</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {/* Change Password */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
          <Lock className="h-5 w-5 mr-2" />
          Change Password
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <button
          onClick={handleChangePassword}
          disabled={updatePasswordMutation.isPending}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {updatePasswordMutation.isPending ? "Changing..." : "Change Password"}
        </button>
      </div>

      {/* Logout */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
          <LogOut className="h-5 w-5 mr-2" />
          Account Actions
        </h2>
        <button
          onClick={handleLogout}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
