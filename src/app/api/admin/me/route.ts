/**
 * Smart Shop - Admin Me API
 * GET /api/admin/me
 * Returns the currently authenticated admin or null.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json({ admin: null });
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/me] Error:", error);
    return NextResponse.json({ admin: null });
  }
}
