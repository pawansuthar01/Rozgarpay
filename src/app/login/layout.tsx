import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Rozgarpay",
  description:
    "Login to your Rozgarpay account to access payroll and staff management",
  robots: "noindex, nofollow",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
