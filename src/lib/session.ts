/**
 * Smart Shop - Server-side Session Verification
 *
 * Used by API routes to verify the session token passed by the middleware
 * and extract the authenticated user ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Extract and verify the authenticated user ID from the request.
 * The middleware passes the session token as x-session-token header.
 * This function verifies it against the database and returns the userId.
 *
 * Returns null if the session is invalid or expired.
 */
export async function getAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  const token = request.headers.get("x-session-token");
  if (!token) {
    return null;
  }

  try {
    const session = await db.authSession.findUnique({
      where: { token },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await db.authSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.userId;
  } catch (error) {
    console.error("[Session] Verification error:", error);
    return null;
  }
}

/**
 * Require authentication — returns userId or a 401 NextResponse.
 * Use in API routes:
 *
 *   const auth = await requireAuth(request);
 *   if (auth instanceof NextResponse) return auth; // 401 response
 *   const userId = auth; // authenticated user ID
 */
export async function requireAuth(
  request: NextRequest
): Promise<string | NextResponse> {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  return userId;
}
