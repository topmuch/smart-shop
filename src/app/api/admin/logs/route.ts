/**
 * Smart Shop - Admin Logs API
 * GET /api/admin/logs — List recent app logs with optional filters
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Authentification administrateur requise" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10))
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
    const level = searchParams.get("level"); // optional: "info" | "warn" | "error"

    const where: Record<string, unknown> = {};
    if (level) {
      where.level = level;
    }

    const [logs, total] = await Promise.all([
      db.appLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.appLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/logs] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
