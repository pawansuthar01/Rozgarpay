import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Rozgarpay - Our Mission & Values",
  description:
    "Learn about Rozgarpay's mission to simplify payroll and staff management. Discover our commitment to security, compliance, and helping businesses grow.",
  keywords:
    "about Rozgarpay, payroll company mission, HR software company, staff management values",
  openGraph: {
    title: "About Rozgarpay",
    description:
      "Learn about our mission to revolutionize payroll and HR management",
    type: "website",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
