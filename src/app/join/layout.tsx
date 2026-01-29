import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Rozgarpay - Create Your Account",
  description: "Join Rozgarpay and simplify your payroll and staff management",
  robots: "noindex, nofollow",
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
