import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      role: string;
      firstName: string | null;
      lastName: string | null;
      companyId: string | null;
      phone: string | null;
      onboardingCompleted: boolean;
      profileImg: null | string;
    };
  }

  interface User {
    role: string;
    firstName: string | null;
    lastName: string | null;
    companyId: string | null;
    email?: string | null;
    phone: string | null;
    onboardingCompleted: boolean;
    profileImg: null | string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    email?: string | null;
    companyId?: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    onboardingCompleted: boolean;
    profileImg: null | string;
  }
}
