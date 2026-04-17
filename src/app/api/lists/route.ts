import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createListSchema, userIdSchema } from "@/lib/validations";

/**
 * GET /api/lists?userId=xxx
 * List all shopping lists for a user. Parses itemsJson to items array.
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

    const lists = await db.shoppingList.findMany({
      where: { userId: parsed.data.userId },
      orderBy: [
        { isDefault: "desc" },
        { updatedAt: "desc" },
      ],
    });

    // Parse itemsJson for each list
    const listsWithItems = lists.map((list) => {
      let items = [];
      try {
        items = JSON.parse(list.itemsJson);
      } catch {
        items = [];
      }
      return {
        ...list,
        items,
      };
    });

    return NextResponse.json({ lists: listsWithItems });
  } catch (error) {
    console.error("[GET /api/lists] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lists
 * Create a new shopping list.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = createListSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, items } = parsed.data;

    // Determine userId
    const userId = (body as Record<string, unknown>).userId as string | undefined;
    if (!userId) {
      let demoUser = await db.user.findFirst();
      if (!demoUser) {
        demoUser = await db.user.create({
          data: {
            email: `demo_${Date.now()}@smartshop.app`,
            name: "Utilisateur Demo",
          },
        });
      }
      (body as Record<string, unknown>).userId = demoUser.id;
    } else {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
    }

    const finalUserId = (body as Record<string, unknown>).userId as string;

    const list = await db.shoppingList.create({
      data: {
        userId: finalUserId,
        name: name ?? "Ma liste de courses",
        itemsJson: JSON.stringify(items ?? []),
        isDefault: false,
      },
    });

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/lists] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
