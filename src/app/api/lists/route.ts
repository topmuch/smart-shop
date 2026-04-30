import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createListSchema } from "@/lib/validations";
import { checkQuota } from "@/lib/feature-flags";
import { requireAuth } from "@/lib/session";

/**
 * GET /api/lists
 * List all shopping lists for the authenticated user.
 * Uses x-user-id from middleware.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== "string") return auth;
    const userId = auth;

    const lists = await db.shoppingList.findMany({
      where: { userId },
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
 * Create a new shopping list for the authenticated user.
 * Uses x-user-id from middleware.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (typeof auth !== "string") return auth;
    const userId = auth;

    const body = await request.json();

    const parsed = createListSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, items } = parsed.data;

    // Check feature flag: maxLists quota
    const currentListCount = await db.shoppingList.count({
      where: { userId },
    });
    const quota = await checkQuota(userId, "maxLists", currentListCount);

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `You have reached the maximum number of lists (${quota.limit}) for your ${quota.plan} plan. Please upgrade to create more lists.`,
          feature: "maxLists",
          limit: quota.limit,
          plan: quota.plan,
        },
        { status: 403 }
      );
    }

    const list = await db.shoppingList.create({
      data: {
        userId,
        name: name ?? "Ma liste de courses",
        itemsJson: JSON.stringify(items ?? []),
        isDefault: false,
      },
    });

    // Parse itemsJson to items for the response
    let parsedItems = [];
    try {
      parsedItems = JSON.parse(list.itemsJson);
    } catch {
      parsedItems = [];
    }

    return NextResponse.json(
      { list: { ...list, items: parsedItems } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/lists] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
