import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userIdSchema } from "@/lib/validations";

/**
 * GET /api/budget?userId=xxx
 * Get budget analytics for a user.
 *
 * Returns:
 *   - currentMonth: { total, sessions }
 *   - previousMonth: { total, sessions }
 *   - categories: Array<{ category, total, count, percentage }>
 *   - monthlyTrend: Array<{ month, total, sessions }> (last 6 months)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get("userId");

    if (!rawUserId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    const parsed = userIdSchema.safeParse({ userId: rawUserId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid userId format", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const userId = parsed.data.userId;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);

    // ── Current month dates ──
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // ── Previous month dates ──
    const previousMonthStart = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth(), 1);
    const previousMonthEnd = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch current month completed sessions with items
    const currentMonthSessions = await db.shoppingSession.findMany({
      where: {
        userId,
        status: "completed",
        startTime: { gte: currentMonthStart, lte: currentMonthEnd },
      },
      include: { scannedItems: true },
    });

    // Fetch previous month completed sessions with items
    const previousMonthSessions = await db.shoppingSession.findMany({
      where: {
        userId,
        status: "completed",
        startTime: { gte: previousMonthStart, lte: previousMonthEnd },
      },
      include: { scannedItems: true },
    });

    // Calculate totals
    const calcTotal = (sessions: typeof currentMonthSessions) =>
      sessions.reduce(
        (sum, session) =>
          sum +
          session.scannedItems.reduce(
            (itemSum, item) => itemSum + item.price * item.quantity,
            0
          ),
        0
      );

    const currentMonthTotal = calcTotal(currentMonthSessions);
    const previousMonthTotal = calcTotal(previousMonthSessions);

    // ── Category breakdown for current month ──
    const categoryMap = new Map<
      string,
      { total: number; count: number }
    >();

    for (const session of currentMonthSessions) {
      for (const item of session.scannedItems) {
        const cat = item.category || "Autre";
        const existing = categoryMap.get(cat) ?? { total: 0, count: 0 };
        existing.total += item.price * item.quantity;
        existing.count += item.quantity;
        categoryMap.set(cat, existing);
      }
    }

    const categories = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        percentage:
          currentMonthTotal > 0
            ? Math.round((data.total / currentMonthTotal) * 1000) / 10
            : 0,
      })
    );

    // Sort by total descending
    categories.sort((a, b) => b.total - a.total);

    // ── Monthly trend (last 6 months) ──
    const monthlyTrend = [];

    for (let i = 5; i >= 0; i--) {
      const trendMonth = new Date(currentYear, currentMonth - i, 1);
      const trendStart = new Date(trendMonth.getFullYear(), trendMonth.getMonth(), 1);
      const trendEnd = new Date(trendMonth.getFullYear(), trendMonth.getMonth() + 1, 0, 23, 59, 59, 999);

      const trendSessions = await db.shoppingSession.findMany({
        where: {
          userId,
          status: "completed",
          startTime: { gte: trendStart, lte: trendEnd },
        },
        include: { scannedItems: true },
      });

      const trendTotal = calcTotal(trendSessions);

      monthlyTrend.push({
        month: trendStart.toLocaleDateString("fr-FR", {
          year: "2-digit",
          month: "short",
        }),
        total: Math.round(trendTotal * 100) / 100,
        sessions: trendSessions.length,
      });
    }

    return NextResponse.json({
      currentMonth: {
        total: Math.round(currentMonthTotal * 100) / 100,
        sessions: currentMonthSessions.length,
      },
      previousMonth: {
        total: Math.round(previousMonthTotal * 100) / 100,
        sessions: previousMonthSessions.length,
      },
      categories,
      monthlyTrend,
    });
  } catch (error) {
    console.error("[GET /api/budget] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
