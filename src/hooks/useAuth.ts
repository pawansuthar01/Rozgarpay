import { OTPService } from "@/lib/OtpService";
import { validatePhoneNumber } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signIn, signOut, getSession } from "next-auth/react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "STAFF";
  status: "ACTIVE" | "INACTIVE";
  profileImg?: string | null;
}

interface SignInWithPasswordRequest {
  phone: string;
  password: string;
}

interface SignInWithOTPRequest {
  otp: string;
  phone: string;
}

interface VerifyOTPRequest {
  phone: string;
  otp: string;
  purpose: "LOGIN" | "RESET_PASSWORD" | "VERIFICATION";
}
interface SentOTPRequest {
  phone: string;
  purpose: "LOGIN" | "REGISTER" | "RESET_PASSWORD";
}

// Query: Get current session
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const session = await getSession();
      return session;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation: Sign in
export function useSignInWithPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SignInWithPasswordRequest) => {
      const result = await signIn("credentials", {
        phone: data.phone,
        password: data.password,
        redirect: false,
      });
      if (!result || result.error) {
        throw new Error(
          result?.error?.includes("CredentialsSignin")
            ? "invalid phone or password please try again..."
            : result?.error || "Invalid credentials",
        );
      }

      return result;
    },
    onSuccess: async () => {
      // Force session refresh
      await new Promise((resolve) => setTimeout(resolve, 100));
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useSignInWithOTP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SignInWithOTPRequest) => {
      const result = await signIn("otp", {
        phone: data.phone,
        otp: data.otp,
        redirect: false,
      });
      if (!result || result.error) {
        throw new Error(
          result?.error?.includes("CredentialsSignin")
            ? "invalid phone or otp please try again..."
            : result?.error || "Invalid credentials",
        );
      }
      return result;
    },
    onSuccess: async () => {
      // Force session refresh
      await new Promise((resolve) => setTimeout(resolve, 100));
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

// Mutation: Sign out
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await signOut({ redirect: false });
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// Mutation: Verify OTP
export function useVerifyOTP() {
  return useMutation({
    mutationFn: async (data: VerifyOTPRequest) => {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        body: JSON.stringify(data),
      });

      return (await response.json()) as Promise<{
        success: boolean;
      }>;
    },
  });
}

// Query: Get user profile
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const { profile } = await response.json();
      return profile as Promise<User>;
    },
  });
}

// Mutation: Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      const { profile } = await response.json();
      return profile as Promise<User>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

// Mutation: Update password
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update password");
      }

      return response.json();
    },
  });
}

// Mutation: Update profile image
export function useUpdateProfileImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profileImg", file);

      const response = await fetch("/api/profile/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload profile image");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

// Mutation: Delete profile image
export function useDeleteProfileImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile/image", {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete profile image");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useSendLoginOtp() {
  return useMutation({
    mutationFn: async (data: SentOTPRequest) => {
      if (!validatePhoneNumber(data.phone)) {
        return { message: "please enter valid number...", success: false };
      }
      const response = await fetch("/api/otp/send", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return (await response.json()) as Promise<{
        success: boolean;
        message: string;
      }>;
    },
  });
}
