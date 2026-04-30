import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionSchema } from "@/lib/validations";
import { requireAuth } from "@/lib/session";

/**
 * GET /api/session
 * List all sessions for the authenticated user, including scannedItems.
 * Uses x-user-id from middleware.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== "string") return auth;
    const userId = auth;

    const sessions = await db.shoppingSession.findMany({
      where: { userId },
      include: { scannedItems: true },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[GET /api/session] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/session
 * Create a new shopping session for the authenticated user.
 * Uses x-user-id from middleware.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== "string") return auth;
    const userId = auth;

    const body = await request.json();

    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { budgetLimit, listId, location } = parsed.data;

    // Build the session data
    const sessionData: Record<string, unknown> = {
      userId,
      budgetLimit,
      location: location ?? null,
    };

    // If a listId is provided, verify it exists AND belongs to the authenticated user
    if (listId) {
      const list = await db.shoppingList.findUnique({
        where: { id: listId, userId },
      });
      if (!list) {
        return NextResponse.json(
          { error: "Shopping list not found" },
          { status: 404 }
        );
      }
      sessionData.listId = listId;
    }

    const session = await db.shoppingSession.create({
      data: sessionData as {
        userId: string;
        budgetLimit: number;
        listId?: string;
        location: string | null;
      },
      include: { scannedItems: true },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/session] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
