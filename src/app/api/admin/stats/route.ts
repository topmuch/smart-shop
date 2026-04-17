/**
 * Smart Shop - Admin Stats API
 * GET /api/admin/stats
 * Returns dashboard statistics. Admin-only.
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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      totalUsers,
      activeUsersToday,
      premiumCount,
      scansToday,
      totalProducts,
      recentUsers,
    ] = await Promise.all([
      // Total registered users
      db.user.count(),

      // Users with activity today (sessions started today)
      db.shoppingSession.groupBy({
        by: ["userId"],
        where: {
          startTime: { gte: todayStart },
        },
      }).then((sessions) => sessions.length),

      // Premium / family plan users
      db.user.count({
        where: {
          plan: { not: "free" },
        },
      }),

      // Scans today
      db.scannedItem.count({
        where: {
          scannedAt: { gte: todayStart },
        },
      }),

      // Total products
      db.product.count(),

      // 5 most recently created users
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      activeUsersToday,
      premiumCount,
      revenueMonthly: 0, // TODO: implémenter avec Stripe si nécessaire
      scansToday,
      totalProducts,
      recentUsers,
    });
  } catch (error) {
    console.error("[GET /api/admin/stats] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
