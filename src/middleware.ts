import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Add custom logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes
        if (pathname === "/login" || pathname.startsWith("/api/auth")) {
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
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
