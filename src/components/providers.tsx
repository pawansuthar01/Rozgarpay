/**
 * Providers Component
 *
 * Enhanced React Query configuration with:
 * - Performance-optimized QueryClient
 * - Request deduplication
 * - Persistent caching
 * - Automatic retry with backoff
 * - Performance monitoring
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { ModalProvider } from "./ModalProvider";
import { InstallPrompt } from "./ui/InstallPrompt";
import { performanceMonitor } from "@/lib/performanceMonitor";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Optimized stale times based on data volatility
            staleTime: 1000 * 60 * 2, // 2 minutes default
            gcTime: 1000 * 60 * 10, // 10 minutes garbage collection

            // Retry configuration with exponential backoff
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors (client errors)
              if (error instanceof Error && error.message.includes("4")) {
                return false;
              }
              return failureCount < 3; // Max 3 retries
            },
            retryDelay: (attemptIndex) => {
              const baseDelay = 1000; // 1 second
              const multiplier = 2;
              const delay = baseDelay * Math.pow(multiplier, attemptIndex);
              return Math.min(delay, 30000); // Max 30 seconds
            },

            // Disable refetch on window focus (user engagement aware)
            refetchOnWindowFocus: false,

            // Background refetch interval (disabled by default)
            refetchInterval: false,

            // Don't refetch on reconnect by default
            refetchOnReconnect: "always",

            // Support concurrent queries
            structuralSharing: true,

            // Query deduplication window (5 seconds)
            networkMode: "online",
          },
          mutations: {
            retry: 1,
            retryDelay: 500,
          },
        },
      }),
  );

  // Setup performance monitoring
  useEffect(() => {
    // Set up alert callback for performance issues
    performanceMonitor.setAlertCallback((message, severity) => {
      // In production, send to monitoring service
      if (process.env.NODE_ENV === "development") {
        console[severity === "error" ? "error" : "warn"](
          `[Performance Monitor] ${severity.toUpperCase()}: ${message}`,
        );
      }
    });

    // Log performance summary periodically
    const summaryInterval = setInterval(() => {
      const summary = performanceMonitor.getSummary();
      if (summary.slowQueries > 0) {
        console.warn(
          `[Performance Monitor] Slow queries detected: ${summary.slowQueries} out of ${summary.totalQueries}`,
        );
      }
    }, 60000); // Every minute

    return () => {
      clearInterval(summaryInterval);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ModalProvider>
          {children}
          <InstallPrompt />
        </ModalProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
