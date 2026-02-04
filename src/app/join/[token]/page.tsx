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
  ArrowLeft,
  Shield,
  ChevronRight,
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

type Step = "info" | "password" | "verify" | "complete";

export default function JoinPage() {
  const params = useParams();
  const { status } = useSession();
  const router = useRouter();
  const token = params.token as string;
  const sendOtp = useSendLoginOtp();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [step, setStep] = useState<Step>("info");
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
  const [activeField, setActiveField] = useState<"phone" | "email" | null>(
    null,
  );

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
        setError("Please enter a valid email address");
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
        setActiveField(type);
        setOtpCooldown((prev) => ({
          ...prev,
          [type]: 60,
        }));
      } else {
        setError(data.error || `Failed to send ${type} OTP`);
        setSuccessMessage("");
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
    if (!otpValue || otpValue.length < 4) {
      setError("Please enter a valid OTP");
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
          `${type === "phone" ? "Phone" : "Email"} verified successfully`,
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

  const handleRegistration = async () => {
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
      setError("Please verify your phone number");
      return;
    }

    const emailProvidedInForm =
      formData.email && formData.email.trim().length > 0;
    const emailRequired = emailProvidedInForm;

    if (emailRequired && !otpVerified.email) {
      setError("Please verify your email");
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

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: "", color: "" };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const levels = [
      { label: "Very Weak", color: "bg-red-500" },
      { label: "Weak", color: "bg-orange-500" },
      { label: "Fair", color: "bg-yellow-500" },
      { label: "Good", color: "bg-blue-500" },
      { label: "Strong", color: "bg-green-500" },
    ];
    return {
      strength: Math.min(strength, 5),
      label: levels[strength - 1]?.label || "",
      color: levels[strength - 1]?.color || "",
    };
  };

  const passwordStrength = getPasswordStrength();
  // Email verification is ONLY required if user enters an email in the form
  // (when invitation doesn't have email pre-filled)
  const showEmailInput = !invitation?.email || !invitation.email.trim();
  const userEnteredEmail = formData.email && formData.email.trim().length > 0;
  const emailRequiredForVerification = showEmailInput && userEnteredEmail;

  const canProceedInfo = formData.firstName.trim() && formData.lastName.trim();

  const canProceedPassword =
    formData.password.length >= 8 &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword;
  const canProceedVerify =
    otpVerified.phone && (!emailRequiredForVerification || otpVerified.email);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Invalid Invitation
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome Aboard!
            </h1>
            <p className="text-gray-600 mb-6">
              Your account for {invitation?.company.name} has been created
              successfully.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>Go to Login</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { id: "info", label: "Personal Info", icon: User },
    { id: "password", label: "Password", icon: Lock },
    { id: "verify", label: "Verify", icon: Shield },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className={`flex items-center ${index < steps.length - 1 ? "flex-1" : ""}`}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                        isCompleted
                          ? "bg-green-600"
                          : isActive
                            ? "bg-blue-600"
                            : "bg-gray-200"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-white" />
                      ) : (
                        <Icon
                          className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400"}`}
                        />
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-12 sm:w-20 h-1 mx-2 ${isCompleted ? "bg-green-600" : "bg-gray-200"}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto py-6 px-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-8 text-center">
            <Building2 className="h-12 w-12 text-white mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white">
              Join {invitation?.company.name}
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Step {currentStepIndex + 1} of 3
            </p>
          </div>

          {/* Info Step */}
          {step === "info" && (
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                {invitation?.email ? (
                  <div className="bg-green-50 px-4 py-3 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 mb-1">
                          Email (from invitation)
                        </p>
                        <p className="text-gray-900 font-medium">
                          {invitation.email}
                        </p>
                      </div>
                      <span className="flex items-center text-green-600 text-sm font-medium">
                        <CheckCircle className="h-4 w-4 mr-1" /> Verified
                      </span>
                    </div>
                  </div>
                ) : showEmailInput ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="bg-gray-50 px-4 py-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                  <p className="text-gray-900 font-medium">
                    {invitation?.phone}
                  </p>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-4">
                <button
                  onClick={() => setStep("password")}
                  disabled={!canProceedInfo}
                  className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Continue</span>
                  <ChevronRight className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Password Step */}
          {step === "password" && (
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Create Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded ${i <= passwordStrength.strength ? passwordStrength.color : "bg-gray-200"}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword && (
                    <p
                      className={`text-sm mt-1 ${formData.password === formData.confirmPassword ? "text-green-600" : "text-red-600"}`}
                    >
                      {formData.password === formData.confirmPassword
                        ? "✓ Passwords match"
                        : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 px-4 py-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Use at least 8 characters with a mix
                    of letters, numbers, and symbols.
                  </p>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setStep("info")}
                  className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => {
                    setStep("verify");
                    sendOTP("phone");
                  }}
                  disabled={!canProceedPassword}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Continue</span>
                  <ChevronRight className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Verify Step */}
          {step === "verify" && (
            <div className="p-6 space-y-5">
              {/* Phone Verification */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Phone Number</p>
                      <p className="text-sm text-gray-500">
                        {invitation?.phone}
                      </p>
                    </div>
                  </div>
                  {otpVerified.phone ? (
                    <span className="flex items-center text-green-600 text-sm font-medium">
                      <CheckCircle className="h-5 w-5 mr-1" /> Verified
                    </span>
                  ) : (
                    <span className="text-orange-500 text-sm font-medium">
                      Pending
                    </span>
                  )}
                </div>

                {!otpVerified.phone && (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="phoneOtp"
                        value={formData.phoneOtp}
                        onChange={handleInputChange}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter OTP"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => sendOTP("phone")}
                        disabled={sendingOTP.phone || otpCooldown.phone > 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        {otpCooldown.phone > 0
                          ? `${otpCooldown.phone}s`
                          : sendingOTP.phone
                            ? "Sending..."
                            : "Send OTP"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => verify("phone")}
                      disabled={
                        verifyingOTP.phone || formData.phoneOtp.length < 4
                      }
                      className="mt-2 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {verifyingOTP.phone ? "Verifying..." : "Verify Phone"}
                    </button>
                  </>
                )}
              </div>

              {/* Email Verification - Only show if user entered email in form */}
              {emailRequiredForVerification && (
                <div className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <Mail className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-500">
                          {formData.email || invitation?.email}
                        </p>
                      </div>
                    </div>
                    {otpVerified.email ? (
                      <span className="flex items-center text-green-600 text-sm font-medium">
                        <CheckCircle className="h-5 w-5 mr-1" /> Verified
                      </span>
                    ) : (
                      <span className="text-orange-500 text-sm font-medium">
                        Pending
                      </span>
                    )}
                  </div>

                  {!otpVerified.email && (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="emailOtp"
                          value={formData.emailOtp}
                          onChange={handleInputChange}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter OTP"
                          maxLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => sendOTP("email")}
                          disabled={sendingOTP.email || otpCooldown.email > 0}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
                        >
                          {otpCooldown.email > 0
                            ? `${otpCooldown.email}s`
                            : sendingOTP.email
                              ? "Sending..."
                              : "Send OTP"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => verify("email")}
                        disabled={
                          verifyingOTP.email || formData.emailOtp.length < 4
                        }
                        className="mt-2 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {verifyingOTP.email ? "Verifying..." : "Verify Email"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setStep("password")}
                  className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleRegistration}
                  disabled={!canProceedVerify || submitting}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete</span>
                      <CheckCircle className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          {(successMessage || error) && (
            <div
              className={`mx-6 mb-6 p-4 rounded-lg ${successMessage ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
            >
              <p className="text-sm text-center">{successMessage || error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
