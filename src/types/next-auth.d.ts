import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      role: string;
      firstName?: string | null;
      lastName?: string | null;
      companyId: string | null;
      onboardingCompleted: boolean;
    };
  }

  interface User {
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    companyId: string | null;
    onboardingCompleted: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    companyId?: string | null;
    onboardingCompleted: boolean;
  }
}
