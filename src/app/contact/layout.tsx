import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Rozgarpay - Get in Touch",
  description:
    "Get in touch with Rozgarpay's sales and support team. We're here to help you streamline your payroll and staff management processes.",
  keywords:
    "contact Rozgarpay, payroll software support, HR software contact, sales inquiry",
  openGraph: {
    title: "Contact Rozgarpay",
    description: "Reach out to us for payroll and HR solutions",
    type: "website",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
