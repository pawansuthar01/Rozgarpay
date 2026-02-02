"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useSendLoginOtp } from "@/hooks";
import { signOut, useSession } from "next-auth/react";
import { validateEmail } from "@/lib/utils";

interface Invitation {
  id: string;
  email: string;
  phone: string;
  role: "MANAGER" | "ACCOUNTANT" | "STAFF" | "ADMIN";
  company: {
    id: string;
    name: string;
    description?: string;
  };
  expiresAt: string;
}

export default function JoinPage() {
  const params = useParams();
  const { status } = useSession();
  const router = useRouter();
  const token = params.token as string;
  const sendOtp = useSendLoginOtp();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Registration form
  const [step, setStep] = useState<"details" | "complete">("details");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneOtp: "",
    emailOtp: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingOTP, setSendingOTP] = useState<{
    phone: boolean;
    email: boolean;
  }>({
    phone: false,
    email: false,
  });
  const [verifyingOTP, setVerifyingOTP] = useState<{
    phone: boolean;
    email: boolean;
  }>({
    phone: false,
    email: false,
  });
  const [otpVerified, setOtpVerified] = useState<{
    phone: boolean;
    email: boolean;
  }>({
    phone: false,
    email: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState<{
    phone: number;
    email: number;
  }>({
    phone: 0,
    email: 0,
  });
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    validateInvitation();
  }, [token]);
  useEffect(() => {
    if (status == "authenticated") {
      signOut({
        redirect: false,
      });
    }
  }, [status]);

  // Countdown timer for OTP cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      setOtpCooldown((prev) => ({
        phone: prev.phone > 0 ? prev.phone - 1 : 0,
        email: prev.email > 0 ? prev.email - 1 : 0,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const validateInvitation = async () => {
    try {
      const res = await fetch(`/api/join/${token}`);
      if (res.ok) {
        const data = await res.json();
        setInvitation(data.invitation);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid or expired invitation");
      }
    } catch (error) {
      setError("Failed to validate invitation");
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (type: "phone" | "email") => {
    if (!invitation) return;

    // Check if still in cooldown
    if (otpCooldown[type] > 0) {
      setError(
        `Please wait ${otpCooldown[type]} seconds before requesting another OTP`,
      );
      setSuccessMessage("");
      return;
    }

    setSendingOTP((prev) => ({ ...prev, [type]: true }));
    setError("");
    setSuccessMessage("");

    try {
      if (type == "email" && !validateEmail(formData.email)) {
        setError("Please enter valid email...");
        return;
      }
      const result = await fetch(`/api/join/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          email: type === "email" ? formData.email : undefined,
        }),
      });

      const data = await result.json();

      if (result.ok) {
        setSuccessMessage(`OTP sent to your ${type}`);
        setError("");
        // Set 60 second cooldown
        setOtpCooldown((prev) => ({
          ...prev,
          [type]: 60,
        }));
      } else {
        setError(data.error || `Failed to send ${type} OTP`);
        setSuccessMessage("");
        // If it's a cooldown error from server, try to extract time
        if (data.error && data.error.includes("wait")) {
          const match = data.error.match(/wait (\d+)/);
          if (match) {
            setOtpCooldown((prev) => ({
              ...prev,
              [type]: parseInt(match[1]),
            }));
          }
        }
      }
    } catch (error) {
      setError(`Failed to send ${type} OTP`);
    } finally {
      setSendingOTP((prev) => ({ ...prev, [type]: false }));
    }
  };

  const verify = async (type: "phone" | "email") => {
    if (!invitation) return;

    const otpValue = formData[`${type}Otp` as keyof typeof formData] as string;
    if (!otpValue || otpValue.length !== 4) {
      setError("Please enter a valid 4-digit OTP");
      return;
    }

    setVerifyingOTP((prev) => ({ ...prev, [type]: true }));
    setError("");
    setSuccessMessage("");

    try {
      const result = await fetch(`/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: invitation.phone,
          email: formData.email ?? invitation.email,
          otp: otpValue,
          type: type,
        }),
      });
      const res = await result.json();
      if (res.success) {
        setOtpVerified((prev) => ({ ...prev, [type]: true }));
        setSuccessMessage(
          `${type === "phone" ? "Phone" : "Email"} OTP verified successfully`,
        );
        setError("");
      } else {
        setOtpVerified((prev) => ({ ...prev, [type]: false }));
        setError(res.error);
        setSuccessMessage("");
      }
    } catch (error) {
      setError("Failed to verify OTP");
      setOtpVerified((prev) => ({ ...prev, [type]: false }));
    } finally {
      setVerifyingOTP((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!otpVerified.phone) {
      setError("Please verify your phone OTP before submitting");
      return;
    }
    // Check if email verification is required
    const emailProvidedInForm =
      formData.email && formData.email.trim().length > 0;

    // Email OTP is required ONLY if email is entered in form
    const emailRequired = emailProvidedInForm;

    if (emailRequired && !otpVerified.email) {
      setError("Please verify your email OTP before submitting");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/join/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitation,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || invitation.email,
          password: formData.password,
        }),
      });

      if (res.ok) {
        setStep("complete");
      } else {
        const data = await res.json();
        setError(data.error || "Registration failed");
      }
    } catch (error) {
      setError("Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Check if email verification is required (boolean)
  const emailRequired = Boolean(
    (invitation?.email && invitation.email.trim()) ||
    (formData.email && formData.email.trim()),
  );
  const showEmailInput = !invitation?.email || !invitation.email.trim();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm sm:max-w-md w-full mx-4">
          <div className="bg-white p-6 rounded-lg shadow text-center sm:p-8">
            <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
              Invalid Invitation
            </h1>
            <p className="text-gray-600 mb-6 text-sm">{error}</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm sm:max-w-md w-full mx-4">
          <div className="bg-white p-6 rounded-lg shadow text-center sm:p-8">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
              Setup Complete!
            </h1>
            <p className="text-gray-600 mb-6 text-sm">
              You're all set to start using {invitation?.company.name}.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <span>Go to Login</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto py-6 px-4 sm:max-w-lg sm:px-6">
        <div className="bg-white p-6 rounded-lg shadow sm:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <Building2 className="h-10 w-10 text-blue-600 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Join {invitation?.company.name}
            </h1>
            <p className="text-gray-600 text-sm">
              Complete your registration to start managing your company
            </p>
          </div>

          {/* Registration Form */}
          {step === "details" && (
            <form onSubmit={handleRegistration} className="space-y-4">
              <div className="text-center mb-6">
                <User className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Complete Your Profile
                </h2>
                <p className="text-gray-600 text-sm">
                  Fill in your details and verify your contact information
                </p>
              </div>

              {/* Pre-filled Email (if available) */}
              {invitation?.email && invitation.email.trim() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{invitation?.email}</span>
                  </div>
                </div>
              )}

              {/* Email Input (if not provided in invitation) */}
              {showEmailInput && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email {emailRequired ? "* (Required)" : "(Optional)"}
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required={emailRequired}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Email is required to complete registration
                  </p>
                </div>
              )}

              {/* Pre-filled Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-900">{invitation?.phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* OTP Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone OTP * (Required)
                </label>
                <input
                  type="text"
                  name="phoneOtp"
                  required
                  value={formData.phoneOtp}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => sendOTP("phone")}
                    disabled={sendingOTP.phone || otpCooldown.phone > 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {otpCooldown.phone > 0
                      ? `Wait ${otpCooldown.phone}s`
                      : sendingOTP.phone
                        ? "Sending..."
                        : "Send OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => verify("phone")}
                    disabled={
                      verifyingOTP.phone ||
                      !formData.phoneOtp ||
                      formData.phoneOtp.length !== 4
                    }
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyingOTP.phone
                      ? "Verifying..."
                      : otpVerified.phone
                        ? "✓ Verified"
                        : "Verify"}
                  </button>
                </div>
              </div>

              {/* Email OTP - Show only if email is provided or entered */}
              {emailRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email OTP
                  </label>
                  <input
                    type="text"
                    name="emailOtp"
                    value={formData.emailOtp}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => sendOTP("email")}
                      disabled={sendingOTP.email || otpCooldown.email > 0}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {otpCooldown.email > 0
                        ? `Wait ${otpCooldown.email}s`
                        : sendingOTP.email
                          ? "Sending..."
                          : "Send OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={() => verify("email")}
                      disabled={
                        verifyingOTP.email ||
                        !formData.emailOtp ||
                        formData.emailOtp.length !== 4
                      }
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyingOTP.email
                        ? "Verifying..."
                        : otpVerified.email
                          ? "✓ Verified"
                          : "Verify"}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Complete Registration</span>
                  </>
                )}
              </button>
            </form>
          )}

          {successMessage && (
            <div className="text-green-600 text-sm text-center mt-4 bg-green-50 p-3 rounded-md">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center mt-4 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
