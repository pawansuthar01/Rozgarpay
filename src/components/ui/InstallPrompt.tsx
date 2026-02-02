"use client";

import { usePathname } from "next/navigation";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { X } from "lucide-react";

const ALLOWED_ROUTES = [
  "/staff/dashboard",
  "/admin/dashboard",
  "/super-admin/dashboard",
];

export function InstallPrompt() {
  const pathname = usePathname();
  const { canInstall, install, dismiss } = usePWAInstall();

  // Only show on dashboard pages
  const isAllowedRoute = ALLOWED_ROUTES.some((route) => pathname === route);

  if (!canInstall || !isAllowedRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Install Rozgarpay
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Add to home screen for quick access
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X size={18} />
        </button>
      </div>
      <button
        onClick={install}
        className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Install Now
      </button>
    </div>
  );
}
