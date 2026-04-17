/**
 * Smart Shop - Logout API
 * POST /api/auth/logout
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, buildClearCookie } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Extract token from cookie and delete session from DB
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(
        new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`)
      );
      if (match) {
        await db.authSession.deleteMany({
          where: { token: match[1] },
        });
      }
    }

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Set-Cookie": buildClearCookie(),
        },
      }
    );
  } catch (error) {
    console.error("[POST /api/auth/logout] Error:", error);
    // Still clear the cookie even if DB fails
    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Set-Cookie": buildClearCookie(),
        },
      }
    );
  }
}
