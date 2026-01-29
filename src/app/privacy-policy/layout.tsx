import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Rozgarpay",
  description:
    "Read Rozgarpay's privacy policy to understand how we collect, use, and protect your personal data.",
  keywords:
    "privacy policy, data protection, GDPR, personal data, information security",
  robots: "index, follow",
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
