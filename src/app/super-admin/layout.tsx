"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Plus,
  User,
  Menu,
  LogOut,
  FileText,
  BarChart3,
  Users,
  Bell,
  Shield,
  Settings,
  UserCircle,
  Send,
} from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    {
      name: "Dashboard",
      href: "/super-admin/dashboard",
      icon: LayoutDashboard,
    },
    { name: "Companies", href: "/super-admin/companies", icon: Building2 },
    { name: "Admins", href: "/super-admin/admins", icon: User },
    { name: "Reports", href: "/super-admin/reports", icon: FileText },
    {
      name: "Company Reports",
      href: "/super-admin/reports/companies",
      icon: BarChart3,
    },
    {
      name: "User Reports",
      href: "/super-admin/reports/users",
      icon: Users,
    },
    {
      name: "Notifications",
      href: "/super-admin/notifications",
      icon: Bell,
    },
    {
      name: "Send Notification",
      href: "/super-admin/notifications/send",
      icon: Send,
    },
    {
      name: "Audit Logs",
      href: "/super-admin/audit-logs",
      icon: Shield,
    },
    {
      name: "Settings",
      href: "/super-admin/settings",
      icon: Settings,
    },
    {
      name: "Profile",
      href: "/super-admin/profile",
      icon: UserCircle,
    },
    { name: "Create Company", href: "/super-admin/create-company", icon: Plus },
    { name: "Create Admin", href: "/super-admin/create-admin", icon: User },
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg overflow-y-auto transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-center h-16 px-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Super Admin</h1>
        </div>
        <nav className="mt-8 ">
          <div className="px-4 space-y-2  ">
            {navigation.map((item) => {
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
        <div className=" w-full p-4">
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
            <h1 className="text-lg font-semibold text-gray-900">Super Admin</h1>
            <div></div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1  overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
