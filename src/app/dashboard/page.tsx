"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import OnboardingModal from "@/components/OnboardingModal";

export default function DashboardPage() {
  const { data: session, update } = useSession();
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (session?.user && !session.user.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [session]);

  const handleOnboardingComplete = async () => {
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setShowOnboarding(false);
      // Update session to reflect onboarding completion
      await update({
        onboardingCompleted: true,
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to mark onboarding as complete:", error);
    }
  };

  const handlePunch = async () => {
    if (!image) {
      setMessage("Please select an image");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);

    const res = await fetch("/api/attendance/punch", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Attendance recorded successfully");
      setImage(null);
    } else {
      setMessage(data.error || "Error");
    }
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-3xl font-bold text-gray-900">
                PagarBook Dashboard
              </h1>
              <div className="flex items-center space-x-4">
                <span>
                  Welcome, {session.user.email} ({session.user.role})
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {session.user.role === "STAFF" && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Mark Attendance</h2>
              <p className="text-sm text-gray-600 mb-4">
                Please use the dedicated attendance page for accurate time
                tracking and photo verification.
              </p>
              <div className="text-center">
                <a
                  href="/staff/attendance"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Go to Attendance Page
                </a>
              </div>
            </div>
          )}

          {(session.user.role === "MANAGER" ||
            session.user.role === "ADMIN") && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Manage Attendance</h2>
              <p>Attendance approval interface will be implemented here.</p>
            </div>
          )}
        </main>
      </div>

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        role={session.user.role}
      />
    </>
  );
}
