/**
 * Smart Shop - Logout API
 * POST /api/auth/logout
 */

import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth-utils";

export async function POST() {
  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": `${sessionCookie.name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
      },
    }
  );
}
