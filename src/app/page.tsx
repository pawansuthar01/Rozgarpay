"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role === "SUPER_ADMIN") {
      router.push("/super-admin/dashboard");
    } else if (session?.user?.role === "ADMIN") {
      router.push("/admin/dashboard");
    } else if (session?.user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [session, status, router]);

  return <div>Loading...</div>;
}
