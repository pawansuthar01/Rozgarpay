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
};

const publicRoutes = [
  "/login",
  "/",
  "/Home",
  "/docs",
  "/about",
  "/join",
  "/contact",
  "/privacy-policy",
  "/onboarding",
];

// Auth routes that authenticated users should not access
const authRoutes = ["/login", "/register", "/signup"];

const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
};

// Check if path is a static file that should be public
const isPublicFile = (pathname: string): boolean => {
  // Public file patterns
  const publicFilePatterns = [
    /\/workers\//, // Worker files
    /\.worker\.js$/, // Worker JS files
    /\/manifest\.json$/, // PWA manifest
    /\/logo\.png$/, // Logo files
    /\.svg$/, // SVG files
    /\.ico$/, // Icon files
    /\.json$/, // JSON files
    /\.txt$/, // Text files
  ];
  return publicFilePatterns.some((pattern) => pattern.test(pathname));
};

// Get user dashboard URL based on role
const getDashboardUrl = (role: string): string => {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "STAFF":
      return "/staff/dashboard";
    default:
      return "/";
  }
};

// Check if user can access another user's resource
const canAccessUserResource = (
  pathname: string,
  tokenUserId: string,
  role: string,
): boolean => {
  // Super Admin can access all user resources
  if (role === "SUPER_ADMIN") {
    return true;
  }

  // Admin can access all admin-level user resources
  if (role === "ADMIN") {
    return pathname.startsWith("/admin/");
  }

  // Manager can access staff resources within their scope
  if (role === "MANAGER") {
    return pathname.startsWith("/manager/") || pathname.startsWith("/staff/");
  }

  // Staff can only access their own resources
  if (role === "STAFF") {
    // Check if path contains user ID - staff can only access their own
    const userIdMatch = pathname.match(/\/users\/([^/]+)/);
    if (userIdMatch) {
      return userIdMatch[1] === tokenUserId;
    }
    // Allow access to own profile and attendance
    return (
      pathname.startsWith("/staff/profile") || pathname.includes(tokenUserId)
    );
  }

  return false;
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

    // Strict rate limit for auth endpoints (20 requests per minute)
    if (!checkRateLimit(rateLimitKey, 20, 60000)) {
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

  // Check if route is public or static file
  if (isPublicRoute(pathname) || isPublicFile(pathname)) {
    return response;
  }

  // Get token for protected routes
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Redirect authenticated users away from auth pages
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (token) {
      const role = token.role as string;
      const dashboardUrl = getDashboardUrl(role);
      return NextResponse.redirect(new URL(dashboardUrl, req.url));
    }
    return response;
  }

  if (!token) {
    // Redirect to login if not authenticated
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;
  const userId = token.sub as string;

  // Cross-user path protection - prevent users from accessing other users' resources
  const userResourcePaths = [
    /\/users\/[^/]+$/, // /users/:userId
    /\/users\/[^/]+\/[^/]+$/, // /users/:userId/*
    /\/attendance\/[^/]+$/, // /attendance/:attendanceId
    /\/salary\/[^/]+$/, // /salary/:salaryId
    /\/correction-requests\/[^/]+$/, // /correction-requests/:requestId
  ];

  const isUserResourcePath = userResourcePaths.some((pattern) =>
    pattern.test(pathname),
  );

  if (isUserResourcePath && !canAccessUserResource(pathname, userId, role)) {
    // User is trying to access another user's resource
    const dashboardUrl = getDashboardUrl(role);
    return NextResponse.redirect(new URL(dashboardUrl, req.url));
  }

  // Super Admin routes
  if (pathname.startsWith("/super-admin")) {
    if (role !== "SUPER_ADMIN") {
      const dashboardUrl = getDashboardUrl(role);
      return NextResponse.redirect(new URL(dashboardUrl, req.url));
    }
    return response;
  }

  // Admin routes - ONLY ADMIN and SUPER_ADMIN can access
  if (pathname.startsWith("/admin")) {
    // Block MANAGER and STAFF from accessing admin routes
    if (role === "MANAGER" || role === "STAFF") {
      const dashboardUrl = getDashboardUrl(role);
      return NextResponse.redirect(new URL(dashboardUrl, req.url));
    }
    // Allow ADMIN and SUPER_ADMIN
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return response;
    }
    // Any other role - redirect to their dashboard
    const dashboardUrl = getDashboardUrl(role);
    return NextResponse.redirect(new URL(dashboardUrl, req.url));
  }

  // Manager routes - ONLY MANAGER and SUPER_ADMIN can access (ADMIN can also access if needed)
  if (pathname.startsWith("/manager")) {
    // Block STAFF from accessing manager routes
    if (role === "STAFF") {
      const dashboardUrl = getDashboardUrl(role);
      return NextResponse.redirect(new URL(dashboardUrl, req.url));
    }
    // Allow MANAGER, ADMIN, and SUPER_ADMIN
    if (role === "MANAGER" || role === "ADMIN" || role === "SUPER_ADMIN") {
      return response;
    }
    // Any other role - redirect to their dashboard
    const dashboardUrl = getDashboardUrl(role);
    return NextResponse.redirect(new URL(dashboardUrl, req.url));
  }

  // Staff routes - ONLY STAFF, MANAGER, ADMIN, and SUPER_ADMIN can access
  if (pathname.startsWith("/staff")) {
    // Allow STAFF, MANAGER, ADMIN, and SUPER_ADMIN
    if (
      role === "STAFF" ||
      role === "MANAGER" ||
      role === "ADMIN" ||
      role === "SUPER_ADMIN"
    ) {
      // Prevent caching of authenticated pages
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      return response;
    }
    // Any other role - redirect to their dashboard
    const dashboardUrl = getDashboardUrl(role);
    return NextResponse.redirect(new URL(dashboardUrl, req.url));
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

    // API cross-user protection
    if (isUserResourcePath && !canAccessUserResource(pathname, userId, role)) {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|_static|public|api|favicon.ico|manifest.json|logo.png|\\.worker\\.js|workers).*)",
  ],
};
