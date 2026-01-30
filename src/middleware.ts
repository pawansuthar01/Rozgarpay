import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    //
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public routes
        if (
          pathname === "/login" ||
          pathname === "/" ||
          pathname === "/about" ||
          pathname === "/contact" ||
          pathname === "/privacy-policy" ||
          pathname === "/onboarding" ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/join/") ||
          pathname.startsWith("/api/join/") ||
          pathname.startsWith("/api/otp")
        ) {
          return true;
        }

        // Require authentication for all other routes
        if (!token) {
          return false;
        }

        // Role-based access
        if (pathname.startsWith("/super-admin")) {
          return token.role === "SUPER_ADMIN";
        }

        if (pathname.startsWith("/api/attendance")) {
          // STAFF can access their own, MANAGER/ADMIN can approve
          return true; // Will check in API
        }

        return true;
      },
    },
  },
);

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/super-admin/:path*"],
};
