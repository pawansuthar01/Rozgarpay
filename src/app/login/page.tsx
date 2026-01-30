"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mail, Lock, ArrowRight, Phone, Key } from "lucide-react";
import { validatePhoneNumber } from "@/lib/utils";
import {
  useSendLoginOtp,
  useSignInWithOTP,
  useSignInWithPassword,
} from "@/hooks";
import { useSession, signOut, getSession } from "next-auth/react";

export default function LoginPage() {
  const [phone, setPhone] = useState("+91");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { data: session, status } = useSession();
  const router = useRouter();
  const sendOTP = useSendLoginOtp();
  const loginWithPassword = useSignInWithPassword();
  const loginWithOTP = useSignInWithOTP();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      console.log("Session authenticated, redirecting...", session.user);
      const redirectUrl = getRedirectUrl(session.user.role);
      router.push(redirectUrl);
    }
  }, [status, session, router]);

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

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return;
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!validatePhoneNumber(phone)) {
      setError("Please enter valid phone number");
      return;
    }

    setIsSendingOtp(true);
    setError("");

    try {
      const res = await sendOTP.mutateAsync({ phone, purpose: "LOGIN" });

      if (res.success) {
        setOtpSent(true);
        setCountdown(60); // 60 second countdown
        setError("");
      } else {
        setError(res.message || "Failed to send OTP");
      }
    } catch (error) {
      setError("Failed to send OTP. Please try again.");
    }

    setIsSendingOtp(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");

    if (!validatePhoneNumber(phone)) {
      setError("Please enter valid phone number");
      return;
    }

    if (loginMode === "password" && !password) {
      setError("Please enter your password");
      return;
    }

    if (loginMode === "otp" && (!otp || otp.length !== 4)) {
      setError("Please enter a valid 4-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      const result =
        loginMode === "otp"
          ? await loginWithOTP.mutateAsync({ phone, otp })
          : await loginWithPassword.mutateAsync({ phone, password });

      console.log("Login result:", result);
      // Session update will be handled by the mutation's onSuccess
      // The useEffect watching session status will trigger the redirect
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-blue-700 p-12 flex-col justify-center items-center text-white">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4">Rozgarpay</h1>
          <p className="text-xl mb-8 opacity-90">
            Streamline your payroll and staff management with our comprehensive
            platform
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <span>Track attendance effortlessly</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <span>Manage salaries with ease</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <span>Ensure compliance and accuracy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          {/* Mobile branding */}
          <div className="lg:hidden text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Rozgarpay</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back
            </h2>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <div className="relative">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="phone"
                    name="phone"
                    type="phone"
                    required
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your phone +91"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <span className="text-gray-400 text-xs">
                  please mention country code (+91)
                </span>
              </div>

              {/* Login Mode Buttons */}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setLoginMode("password")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    loginMode === "password"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode("otp")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    loginMode === "otp"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  OTP Login
                </button>
              </div>

              {loginMode === "password" && (
                <div className="relative">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {loginMode === "otp" && (
                <div className="flex justify-center items-center gap-2">
                  <div className="relative flex-1">
                    <label
                      htmlFor="otp"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      OTP
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="otp"
                        name="otp"
                        type="text"
                        required
                        maxLength={4}
                        className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-center text-lg font-mono tracking-widest"
                        placeholder="0000"
                        value={otp}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (value.length <= 4) {
                            setOtp(value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow only digits and navigation keys
                          if (
                            !/^\d$/.test(e.key) &&
                            ![
                              "Backspace",
                              "Delete",
                              "ArrowLeft",
                              "ArrowRight",
                              "Tab",
                            ].includes(e.key)
                          ) {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs">
                      Enter 4-digit OTP sent to your phone
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={
                      isSendingOtp ||
                      countdown > 0 ||
                      !validatePhoneNumber(phone)
                    }
                    className=" px-3 py-2 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center  bg-blue-600 text-white rounded-lg hover:bg-blue-700  transition-colors disabled:opacity-50 "
                  >
                    {isSendingOtp ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : countdown > 0 ? (
                      `Resend OTP in ${countdown}s`
                    ) : otpSent ? (
                      "Resend OTP"
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
