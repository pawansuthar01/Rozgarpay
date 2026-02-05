"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  Bell,
  Settings,
  UserCircle,
  Menu,
  LogOut,
  UserPlus,
  Mail,
  IndianRupee,
  Search,
  Home,
  ChevronRight,
  Building2,
} from "lucide-react";
import NavbarProfile from "@/components/layout/NavbarProfile";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchAdminDashboard } from "@/hooks/useDashboard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Prefetch dashboard data for faster page transitions
  useEffect(() => {
    if (typeof window !== "undefined") {
      prefetchAdminDashboard(queryClient);
    }
  }, [queryClient]);

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split("/").filter(Boolean);
    const breadcrumbs = [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
    ];

    if (pathSegments.length > 1) {
      const pathMap: { [key: string]: { name: string; icon: any } } = {
        attendance: { name: "Attendance", icon: CheckSquare },
        salary: { name: "Salary", icon: IndianRupee },
        cashbook: { name: "Cashbook", icon: IndianRupee },
        reports: { name: "Reports", icon: FileText },
        users: { name: "Staff", icon: Users },
        invitations: { name: "Invitations", icon: Mail },
        settings: { name: "Settings", icon: Settings },
        profile: { name: "Profile", icon: UserCircle },
      };

      let currentPath = "";
      pathSegments.slice(1).forEach((segment, index) => {
        currentPath += `/${segment}`;
        const fullPath = `/admin${currentPath}`;

        if (pathMap[segment]) {
          breadcrumbs.push({
            name: pathMap[segment].name,
            href: fullPath,
            icon: pathMap[segment].icon,
          });
        } else if (segment.match(/^\d+$/) && index > 0) {
          // Handle dynamic routes like [userId]
          const prevSegment = pathSegments[index]; // This would be the parent segment
          if (pathMap[prevSegment]) {
            breadcrumbs.push({
              name: `${pathMap[prevSegment].name} Details`,
              href: fullPath,
              icon: pathMap[prevSegment].icon,
            });
          }
        }
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const sidebarNavigation = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    { name: "Attendance", href: "/admin/attendance", icon: CheckSquare },
    { name: "Salary", href: "/admin/salary", icon: IndianRupee },
    { name: "Cashbook", href: "/admin/cashbook", icon: IndianRupee },
    { name: "Salary Setup", href: "/admin/salary/setup", icon: Settings },
    // { name: "Reports", href: "/admin/reports", icon: FileText },
    { name: "Staff", href: "/admin/users", icon: Users },
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
    { name: "Staff", href: "/admin/users", icon: Users },
    { name: "Attendance", href: "/admin/attendance", icon: CheckSquare },
    { name: "Salary", href: "/admin/salary/setup", icon: IndianRupee },
    { name: "Add Staff", href: "/admin/users/add", icon: UserPlus },
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        {/* Logo/Brand Section */}
        <div className="flex items-center justify-center h-16 px-6 border-b border-gray-200 bg-blue-600">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-white">
              <h1 className="text-lg font-bold">Rozgarpay</h1>
              <p className="text-xs opacity-90">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          <div className="space-y-1">
            {sidebarNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
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

        {/* Sign Out Button */}
        <div className="p-4 border-t border-gray-200">
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
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden lg:flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => {
                const Icon = crumb.icon;
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <div key={crumb.href} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                    )}
                    <Link
                      href={crumb.href}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
                        isLast
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{crumb.name}</span>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Profile */}
            <div className="flex items-center">
              <NavbarProfile />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 lg:mb-0 mb-10 overflow-y-auto bg-gray-50">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Bottom navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40">
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
                  className={`h-5 w-5 mb-1 ${
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
