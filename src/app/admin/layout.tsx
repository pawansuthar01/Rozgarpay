"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  DollarSign,
  FileText,
  BarChart3,
  Bell,
  Settings,
  UserCircle,
  Menu,
  LogOut,
  UserPlus,
  Mail,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const sidebarNavigation = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    { name: "Attendance", href: "/admin/attendance", icon: CheckSquare },
    { name: "Salary", href: "/admin/salary", icon: DollarSign },
    { name: "Salary Setup", href: "/admin/salary/setup", icon: Settings },
    { name: "Staff", href: "/admin/staff", icon: Users },
    { name: "Reports", href: "/admin/reports", icon: FileText },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Invitations", href: "/admin/invitations", icon: Mail },
    { name: "Settings", href: "/admin/settings", icon: Settings },

    {
      name: "Profile",
      href: "/admin/profile",
      icon: UserCircle,
    },
    { name: "Add Staff", href: "/admin/users/add", icon: UserPlus },
  ];

  const bottomNavigation = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    { name: "Staff", href: "/admin/staff", icon: Users },
    { name: "Attendance", href: "/admin/attendance", icon: CheckSquare },
    { name: "Salary", href: "/admin/salary/setup", icon: DollarSign },
    { name: "Add Staff", href: "/admin/staff/add", icon: UserPlus },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-center h-16 px-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <nav className="mt-8">
          <div className="px-4 space-y-2 overflow-y-auto h-[calc(100vh-8rem)] pb-20">
            {sidebarNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    pathname === item.href
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="absolute bottom-0 w-full p-4">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar for mobile */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            <div></div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40 shadow-lg">
        <div className="flex justify-around items-center h-16 px-2">
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 py-3 px-2 text-xs font-medium transition-all duration-200 rounded-lg mx-1 ${
                  isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                }`}
              >
                <Icon
                  className={`h-6 w-6 mb-1 ${
                    isActive ? "text-blue-600" : "text-gray-600"
                  }`}
                />
                <span className="truncate text-center leading-tight">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
