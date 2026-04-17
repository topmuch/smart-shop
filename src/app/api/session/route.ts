import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionSchema, userIdSchema } from "@/lib/validations";

/**
 * GET /api/session?userId=xxx
 * List all sessions for a user, including scannedItems.
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

    const sessions = await db.shoppingSession.findMany({
      where: { userId: parsed.data.userId },
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
 * Create a new shopping session.
 */
export async function POST(request: NextRequest) {
  try {
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
      budgetLimit,
      location: location ?? null,
    };

    // If a listId is provided, verify it exists
    if (listId) {
      const list = await db.shoppingList.findUnique({ where: { id: listId } });
      if (!list) {
        return NextResponse.json(
          { error: "Shopping list not found" },
          { status: 404 }
        );
      }
      sessionData.listId = listId;
    }

    // For demo purposes, use a default userId if none provided in body
    const userId = (body as Record<string, unknown>).userId as string | undefined;
    if (!userId) {
      // Try to find a demo user or create one
      let demoUser = await db.user.findFirst();
      if (!demoUser) {
        demoUser = await db.user.create({
          data: {
            email: `demo_${Date.now()}@smartshop.app`,
            name: "Utilisateur Demo",
          },
        });
      }
      sessionData.userId = demoUser.id;
    } else {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      sessionData.userId = userId;
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
