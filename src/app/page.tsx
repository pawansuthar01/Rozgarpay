"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConfigPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (status === "authenticated" && session?.user) {
      const redirectUrl = getRedirectUrl(session.user.role);
      router.push(redirectUrl);
    } else if (status === "unauthenticated") {
      router.push("/Home");
    }
  }, [status, session, router, mounted]);

  const getRedirectUrl = (role: string): string => {
    switch (role) {
      case "SUPER_ADMIN":
        return "/super-admin/dashboard";
      case "ADMIN":
        return "/admin/dashboard";
      default:
        return "/staff/dashboard";
    }
  };

  // Prevent flash of content by showing nothing until mounted
  if (!mounted || status === "loading") {
    return null;
  }

  return null;
}
