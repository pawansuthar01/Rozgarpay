import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Helper function to check rate limit
const checkRateLimit = (
  key: string,
  limit: number = 100,
  windowMs: number = 60000,
): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
};

// Security headers
const securityHeaders: Record<string, string> = {
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const publicRoutes = [
  "/login",
  "/",
  "/Home",
  "/about",
  "/contact",
  "/privacy-policy",
  "/onboarding",
];

const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Add security headers to all responses
  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Block access to sensitive files
  if (
    pathname.includes(".env") ||
    pathname.includes(".git") ||
    pathname.includes("__tests__") ||
    pathname.includes(".log")
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Rate limiting for sensitive endpoints
  const sensitivePaths = ["/api/auth", "/api/otp", "/api/attendance/punch"];
  const isSensitivePath = sensitivePaths.some((path) =>
    pathname.startsWith(path),
  );

  if (isSensitivePath) {
    const clientIP = req.headers.get("x-forwarded-for") || req.ip || "unknown";
    const rateLimitKey = `${clientIP}:${pathname}`;

    // Strict rate limit for auth endpoints (10 requests per minute)
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...securityHeaders,
          },
        },
      );
    }
  }

  // Check if route is public
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Get token for protected routes
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // Redirect to login if not authenticated
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  const role = token.role as string;

  // Super Admin routes
  if (pathname.startsWith("/super-admin")) {
    if (role !== "SUPER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 403 });
    }
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (role === "ADMIN") {
      return response;
    }
    if (role === "MANAGER" && pathname.startsWith("/manager")) {
      return response;
    }
    if (role === "STAFF" && pathname.startsWith("/staff")) {
      return response;
    }
    // Block other roles
    return new NextResponse("Unauthorized", { status: 403 });
  }

  // Manager routes
  if (pathname.startsWith("/manager")) {
    if (role === "MANAGER" || role === "ADMIN") {
      return response;
    }
    return new NextResponse("Unauthorized", { status: 403 });
  }

  // Staff routes
  if (pathname.startsWith("/staff")) {
    if (role === "STAFF" || role === "ADMIN" || role === "MANAGER") {
      // Prevent caching of authenticated pages
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      return response;
    }
    return new NextResponse("Unauthorized", { status: 403 });
  }

  // API routes protection
  if (pathname.startsWith("/api/")) {
    // Allow public API routes
    const publicApiRoutes = [
      "/api/auth",
      "/api/join",
      "/api/otp",
      "/api/contact",
      "/api/upload",
    ];

    const isPublicApiRoute = publicApiRoutes.some((route) =>
      pathname.startsWith(route),
    );

    if (!isPublicApiRoute && !token) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder
     * - api/health (health check)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/health).*)",
  ],
};
