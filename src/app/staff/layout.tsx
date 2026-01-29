"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  Bell,
  UserCircle,
  Menu,
  LogOut,
  X,
} from "lucide-react";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sidebarNavigation = [
    {
      name: "Dashboard",
      href: "/staff/dashboard",
      icon: LayoutDashboard,
      priority: 1,
    },
    {
      name: "Attendance",
      href: "/staff/attendance",
      icon: CheckSquare,
      priority: 2,
    },
    { name: "Salary", href: "/staff/salary", icon: DollarSign, priority: 3 },
    {
      name: "My Ledger",
      href: "/staff/cashbook",
      icon: DollarSign,
      priority: 3.5,
    },
    {
      name: "Notifications",
      href: "/staff/notifications",
      icon: Bell,
      priority: 4,
    },
    { name: "Profile", href: "/staff/profile", icon: UserCircle, priority: 5 },
  ];

  // Mobile-first bottom navigation - prioritize key features
  const bottomNavigation = [
    {
      name: "Dashboard",
      href: "/staff/dashboard",
      icon: LayoutDashboard,
      shortName: "Home",
    },
    {
      name: "Attendance",
      href: "/staff/attendance",
      icon: CheckSquare,
      shortName: "Attend",
    },
    {
      name: "Salary",
      href: "/staff/salary",
      icon: DollarSign,
      shortName: "Salary",
    },
    {
      name: "Notifications",
      href: "/staff/notifications",
      icon: Bell,
      shortName: "Alerts",
    },
  ];

  const getPageTitle = () => {
    const currentPage = sidebarNavigation.find(
      (item) => item.href === pathname,
    );
    return currentPage ? currentPage.name : "Staff Panel";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: slide-in overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white  transform transition-all duration-300 ease-in-out ${
          isMobile
            ? sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "translate-x-0 static"
        } ${!isMobile ? "lg:static lg:inset-0" : ""}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-b border-blue-500">
          <h1 className="text-xl font-bold">Staff Portal</h1>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6">
          <div className="px-4 space-y-1">
            {sidebarNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white  "
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-gray-500 group-hover:text-blue-600"
                    }`}
                  />
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center px-4 py-3 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header - Enhanced for better UX */}
        {isMobile && (
          <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
            <div className="flex items-center justify-between px-4 py-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -m-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex-1 text-center">
                <h1 className="text-lg font-semibold text-gray-900">
                  {getPageTitle()}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {pathname === "/staff/dashboard" && "Welcome back!"}
                  {pathname === "/staff/attendance" && "Track your attendance"}
                  {pathname === "/staff/salary" && "View your earnings"}
                  {pathname === "/staff/cashbook" &&
                    "View your financial ledger"}
                  {pathname === "/staff/notifications" && "Stay updated"}
                  {pathname === "/staff/profile" && "Manage your profile"}
                </p>
              </div>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </header>
        )}

        {/* Page Content */}
        <main
          className={`flex-1 overflow-y-auto ${
            isMobile
              ? "p-4 pb-24" // Extra bottom padding for mobile nav
              : "p-6 lg:p-8"
          }`}
        >
          <div
            className={`max-w-7xl mx-auto ${
              pathname === "/staff/dashboard" ? "" : "space-y-6"
            }`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Enhanced Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-40 shadow-2xl">
          <div className="flex items-center h-20 px-2 safe-area-bottom">
            {bottomNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center flex-1 py-2 px-1 text-xs font-medium transition-all duration-300 rounded-xl mx-1 ${
                    isActive
                      ? "text-blue-600 bg-blue-50  transform scale-105"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg mb-1 transition-all duration-300 ${
                      isActive
                        ? "bg-blue-100 text-blue-600"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isActive ? "text-blue-600" : "text-gray-600"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-center leading-tight font-medium ${
                      isActive ? "text-blue-600" : "text-gray-600"
                    }`}
                  >
                    {item.shortName}
                  </span>
                  {isActive && (
                    <div className="w-1 h-1 bg-blue-600 rounded-full mt-1" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
