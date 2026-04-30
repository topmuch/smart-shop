/**
 * Smart Shop - Authentication Middleware (Edge Runtime Compatible)
 *
 * Validates session cookie on ALL /api/* routes except public ones.
 * Since Edge Runtime cannot use Prisma, this middleware:
 * 1. Checks that the session cookie exists
 * 2. Passes the token as x-session-token header for API routes to verify
 *
 * API routes MUST verify the session token against the database themselves.
 * This is a lightweight auth gate — not a full session validator.
 */

import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "smartshop_session";
const ADMIN_COOKIE_NAME = "smartshop_admin";

/** Routes that do NOT require authentication */
const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
  "/api/admin/login",
  "/api/webhooks/stripe",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without authentication
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Only apply to /api/* routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Extract session token from cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Pass the session token as a header so API routes can verify it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-session-token", sessionCookie.value);

  // Also pass the admin cookie token if present (for admin routes)
  const adminCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (adminCookie?.value) {
    requestHeaders.set("x-admin-token", adminCookie.value);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: "/api/:path*",
};
