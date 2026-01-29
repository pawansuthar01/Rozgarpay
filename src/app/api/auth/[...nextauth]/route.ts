import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { OTPService } from "@/lib/OtpService";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "phone" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
        });

        if (!user || user.status !== "ACTIVE") {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          onboardingCompleted: user.onboardingCompleted,
          profileImg: user.profileImg,
        };
      },
    }),
    CredentialsProvider({
      id: "otp",
      name: "otp",

      credentials: {
        phone: { label: "Phone Number", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.phone || !credentials?.otp) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { phone: credentials.phone },
          });

          if (!user || user.status !== "ACTIVE") {
            return null;
          }

          const success = await OTPService.verifyOTP(
            user.phone,
            credentials.otp,
          );

          if (!success) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            companyId: user.companyId,
            onboardingCompleted: user.onboardingCompleted,
            profileImg: user.profileImg,
          };
        } catch (error) {
          console.error("OTP authorize error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.phone = user.phone;
        token.email = user.email;
        token.role = user.role;
        token.companyId = user.companyId;
        token.onboardingCompleted = user.onboardingCompleted;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.profileImg = user.profileImg;
      }
      if (trigger === "update") {
        token.onboardingCompleted = session.onboardingCompleted ?? true;
        token.firstName = session.firstName;
        token.lastName = session.lastName;
        token.profileImg = session.profileImg;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role!;
        session.user.companyId = token.companyId ?? null;
        session.user.onboardingCompleted = token.onboardingCompleted ?? false;
        session.user.firstName = token.firstName ?? null;
        session.user.lastName = token.lastName ?? null;
        session.user.phone = token.phone ?? null;
        session.user.email = token.email ?? null;
        session.user.profileImg = token.profileImg ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};

// Lazily create the NextAuth handler inside each request to avoid
// calling `NextAuth()` during module evaluation (which causes
// side-effects when other server modules import `authOptions`).
export async function GET(request: Request) {
  const handler = NextAuth(authOptions);
  // NextAuth handler expects to be called with the Request object.
  // It returns a Response-compatible result that Next can use.
  return handler(request as any);
}

export async function POST(request: Request) {
  const handler = NextAuth(authOptions);
  return handler(request as any);
}
