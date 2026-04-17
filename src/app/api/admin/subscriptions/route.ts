/**
 * Smart Shop - Admin Subscriptions API
 * GET /api/admin/subscriptions
 * Lists all premium/family users with their plan details.
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
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
    );
    const plan = searchParams.get("plan"); // optional filter: "premium" | "family"

    const where: Record<string, unknown> = {
      plan: { not: "free" },
    };
    if (plan && (plan === "premium" || plan === "family")) {
      where.plan = plan;
    }

    const [subscriptions, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          createdAt: true,
          _count: {
            select: {
              shoppingSessions: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    // Group by plan for summary
    const planCounts = await db.user.groupBy({
      by: ["plan"],
      where: { plan: { not: "free" } },
      _count: true,
    });

    const planSummary = Object.fromEntries(
      planCounts.map((g) => [g.plan, g._count])
    );

    return NextResponse.json({
      subscriptions,
      planSummary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/subscriptions] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
