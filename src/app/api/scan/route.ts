import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scanProductSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { checkQuota } from "@/lib/feature-flags";
import { requireAuth } from "@/lib/session";

/**
 * POST /api/scan
 * Scan a product into a session.
 * Price is stored in cents (Int).
 * Rate limited: 5 requests per minute per sessionId.
 * Verifies that the session belongs to the authenticated user.
 * Includes budget check: returns budgetWarning if near or over limit.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== "string") return auth;
    const userId = auth;

    const body = await request.json();

    const parsed = scanProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, barcode, productName, price, category, quantity } =
      parsed.data;

    // Rate limiting: 5 requests per minute per session
    const { allowed, remaining } = rateLimit(
      `scan:${sessionId}`,
      5,
      60 * 1000
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Too many scan requests. Please wait a moment before scanning again.",
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
          },
        }
      );
    }

    // Verify session exists, is active, AND belongs to the authenticated user
    const session = await db.shoppingSession.findUnique({
      where: { id: sessionId, userId },
      include: { scannedItems: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Cannot scan items in a completed or abandoned session" },
        { status: 400 }
      );
    }

    // Check feature flag: maxScansPerSession quota
    const scanQuota = await checkQuota(userId, "maxScansPerSession", session.scannedItems.length);
    if (!scanQuota.allowed) {
      return NextResponse.json(
        {
          error: `You have reached the maximum number of scans per session (${scanQuota.limit}) for your ${scanQuota.plan} plan. Please upgrade to scan more items.`,
          feature: "maxScansPerSession",
          limit: scanQuota.limit,
          plan: scanQuota.plan,
        },
        { status: 403 }
      );
    }

    // ── Budget check ──
    // Calculate current total (in cents) and check against budget limit
    const currentTotal = session.scannedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const newItemCost = price * (quantity ?? 1);
    const projectedTotal = currentTotal + newItemCost;
    const budgetLimit = session.budgetLimit;

    // Build budget warning if applicable (still allow the scan)
    let budgetWarning: string | undefined;
    if (budgetLimit > 0 && projectedTotal > budgetLimit) {
      budgetWarning = "over_budget";
    } else if (budgetLimit > 0 && projectedTotal > budgetLimit * 0.8) {
      budgetWarning = "near_limit";
    }

    // Check if barcode already exists in this session — increment quantity
    const existingItem = session.scannedItems.find(
      (item) => item.barcode === barcode
    );

    if (existingItem) {
      const updatedItem = await db.scannedItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + (quantity ?? 1),
        },
      });

      // Recalculate budget warning with updated quantity
      const updatedTotal = currentTotal + (price * (quantity ?? 1));
      if (budgetLimit > 0 && updatedTotal > budgetLimit) {
        budgetWarning = "over_budget";
      } else if (budgetLimit > 0 && updatedTotal > budgetLimit * 0.8) {
        budgetWarning = "near_limit";
      }

      const response: Record<string, unknown> = {
        item: updatedItem,
        message: `Quantity updated for ${productName}`,
        incremented: true,
        newQuantity: updatedItem.quantity,
        budgetTotal: updatedTotal,
        budgetLimit,
      };
      if (budgetWarning) {
        response.budgetWarning = budgetWarning;
      }

      return NextResponse.json(response, {
        headers: { "X-RateLimit-Remaining": String(remaining) },
      });
    }

    // Create new scanned item
    const newItem = await db.scannedItem.create({
      data: {
        sessionId,
        barcode,
        productName,
        price,
        category: category ?? "Autre",
        quantity: quantity ?? 1,
      },
    });

    const response: Record<string, unknown> = {
      item: newItem,
      message: `Scanned: ${productName}`,
      incremented: false,
      budgetTotal: projectedTotal,
      budgetLimit,
    };
    if (budgetWarning) {
      response.budgetWarning = budgetWarning;
    }

    return NextResponse.json(response, {
      status: 201,
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (error) {
    console.error("[POST /api/scan] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
