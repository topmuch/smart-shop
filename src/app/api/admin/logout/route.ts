/**
 * Smart Shop - Admin Logout API
 * POST /api/admin/logout
 */

import { NextResponse } from "next/server";
import { buildAdminClearCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": buildAdminClearCookie(),
      },
    }
  );
}
