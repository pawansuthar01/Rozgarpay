import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Rozgarpay - Payroll & Staff Management Platform",
  description:
    "Simplify your payroll management with Rozgarpay. Track attendance, manage salaries, generate reports, and ensure compliance with our comprehensive staff management platform.",
  keywords:
    "payroll software, staff management, attendance tracking, salary management, HR platform, payroll system",
  authors: [{ name: "Rozgarpay" }],
  creator: "Rozgarpay",
  publisher: "Rozgarpay",
  robots: "index, follow",
  openGraph: {
    title: "Rozgarpay - Payroll & Staff Management Platform",
    description:
      "Streamline your payroll and staff management operations with Rozgarpay",
    type: "website",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rozgarpay",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="shortcut icon" href="/logo.png" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className={`antialiased`}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
