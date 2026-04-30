import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { finishSessionSchema } from "@/lib/validations";
import { requireAuth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/session/[id]
 * Get a specific session by ID with scannedItems.
 * Only if it belongs to the authenticated user.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== "string") return auth;
    const userId = auth;

    const { id } = await params;

    const session = await db.shoppingSession.findUnique({
      where: { id, userId },
      include: { scannedItems: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("[GET /api/session/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/session/[id]
 * Update a session (finish or abandon).
 * Only if it belongs to the authenticated user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== "string") return auth;
    const userId = auth;

    const { id } = await params;

    // Verify ownership
    const session = await db.shoppingSession.findUnique({
      where: { id, userId },
      include: { scannedItems: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, status } = body as { action?: string; status?: string };

    // Support both { action: "finish" } and { status: "completed" } formats
    const effectiveAction = action ?? (status === "completed" ? "finish" : status === "abandoned" ? "abandon" : undefined);

    if (effectiveAction === "finish") {
      // Validate with finish schema
      const parsed = finishSessionSchema.safeParse({ sessionId: id });
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid session ID", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      if (session.status !== "active") {
        return NextResponse.json(
          { error: "Only active sessions can be finished" },
          { status: 400 }
        );
      }

      // Calculate total from scanned items
      const totalSpent = session.scannedItems.reduce(
        (sum: number, item: { price: number; quantity: number }) =>
          sum + item.price * item.quantity,
        0
      );

      const updatedSession = await db.shoppingSession.update({
        where: { id },
        data: {
          status: "completed",
          totalSpent,
          endTime: new Date(),
        },
        include: { scannedItems: true },
      });

      return NextResponse.json({ session: updatedSession });
    }

    if (effectiveAction === "abandon") {
      if (session.status !== "active") {
        return NextResponse.json(
          { error: "Only active sessions can be abandoned" },
          { status: 400 }
        );
      }

      const updatedSession = await db.shoppingSession.update({
        where: { id },
        data: {
          status: "abandoned",
          endTime: new Date(),
        },
        include: { scannedItems: true },
      });

      return NextResponse.json({ session: updatedSession });
    }

    // Generic update for notes, budgetLimit, etc.
    const updateData: Record<string, unknown> = {};
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.budgetLimit !== undefined) updateData.budgetLimit = body.budgetLimit;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update. Provide 'action', 'notes', or 'budgetLimit'." },
        { status: 400 }
      );
    }

    const updatedSession = await db.shoppingSession.update({
      where: { id },
      data: updateData,
      include: { scannedItems: true },
    });

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error("[PATCH /api/session/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/session/[id]
 * Delete a session and all its scanned items (cascade).
 * Only if it belongs to the authenticated user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== "string") return auth;
    const userId = auth;

    const { id } = await params;

    const session = await db.shoppingSession.findUnique({
      where: { id, userId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    await db.shoppingSession.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Session deleted successfully",
      sessionId: id,
    });
  } catch (error) {
    console.error("[DELETE /api/session/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
