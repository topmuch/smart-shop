/**
 * Smart Shop - Me API (Get Current User)
 * GET /api/auth/me
 * Reads session token from cookie, looks up the session in DB,
 * returns the associated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) {
      return NextResponse.json({ user: null });
    }

    const match = cookieHeader.match(
      new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`)
    );
    if (!match) {
      return NextResponse.json({ user: null });
    }

    const token = match[1];

    // Look up session by token in DB
    const session = await db.authSession.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json({ user: null });
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await db.authSession.delete({ where: { id: session.id } });
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        plan: session.user.plan,
        budgetDefault: session.user.budgetDefault,
        avatarUrl: session.user.avatarUrl,
        createdAt: session.user.createdAt,
      },
    });
  } catch (error) {
    console.error("[GET /api/auth/me] Error:", error);
    return NextResponse.json({ user: null });
  }
}
