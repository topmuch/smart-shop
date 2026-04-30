import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReceiptSchema } from "@/lib/validations";
import { generateReceiptPDF, generateReceiptHash } from "@/lib/export-pdf";
import { generateCSV } from "@/lib/export-csv";
import type { ShoppingSession, ScannedItem } from "@/types";
import { requireAuth } from "@/lib/session";

/**
 * POST /api/receipt
 * Generate a receipt for a completed session.
 * Verifies that the session belongs to the authenticated user.
 * All prices are in cents.
 *
 * Body: { sessionId }
 *
 * Steps:
 *  1. Validate session exists, is completed, and belongs to user
 *  2. Generate hash (async, using crypto.subtle)
 *  3. Generate PDF and CSV
 *  4. Save to Receipt table
 *  5. Return receipt with hash
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== "string") return auth;
    const userId = auth;

    const body = await request.json();

    const parsed = generateReceiptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId } = parsed.data;

    // Fetch session with items — must belong to the authenticated user
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

    if (session.status !== "completed") {
      return NextResponse.json(
        {
          error: "Receipt can only be generated for completed sessions",
          currentStatus: session.status,
        },
        { status: 400 }
      );
    }

    if (session.scannedItems.length === 0) {
      return NextResponse.json(
        { error: "Cannot generate receipt for a session with no scanned items" },
        { status: 400 }
      );
    }

    // Check if receipt already exists
    const existingReceipt = await db.receipt.findUnique({
      where: { sessionId },
    });

    if (existingReceipt) {
      return NextResponse.json({
        receipt: existingReceipt,
        message: "Receipt already exists for this session",
        regenerated: false,
      });
    }

    // Cast Prisma result to app types for export functions
    const sessionData = session as unknown as ShoppingSession & { scannedItems: ScannedItem[] };

    // Generate SHA-256 hash first (async, deterministic)
    const hash = await generateReceiptHash(sessionData);

    // Generate PDF with embedded hash
    const pdfBase64 = generateReceiptPDF(sessionData, hash);

    // Generate CSV
    const csvData = generateCSV(sessionData);

    // Calculate total amount (in cents) for the receipt record
    const totalAmount = session.scannedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Save receipt to database
    const receipt = await db.receipt.create({
      data: {
        sessionId,
        pdfData: pdfBase64,
        csvData,
        hash,
        totalAmount, // stored as Float for display/computed field
      },
    });

    return NextResponse.json({
      receipt,
      message: "Receipt generated successfully",
      regenerated: true,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/receipt] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
