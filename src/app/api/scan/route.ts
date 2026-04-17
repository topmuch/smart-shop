import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scanProductSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/scan
 * Scan a product into a session.
 * Rate limited: 5 requests per minute per sessionId.
 */
export async function POST(request: NextRequest) {
  try {
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

    // Verify session exists and is active
    const session = await db.shoppingSession.findUnique({
      where: { id: sessionId },
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

      return NextResponse.json(
        {
          item: updatedItem,
          message: `Quantity updated for ${productName}`,
          incremented: true,
          newQuantity: updatedItem.quantity,
        },
        {
          headers: { "X-RateLimit-Remaining": String(remaining) },
        }
      );
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

    return NextResponse.json(
      {
        item: newItem,
        message: `Scanned: ${productName}`,
        incremented: false,
      },
      { status: 201, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (error) {
    console.error("[POST /api/scan] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
