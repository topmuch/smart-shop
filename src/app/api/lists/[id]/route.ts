import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateListSchema } from "@/lib/validations";
import { requireAuth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lists/[id]
 * Get a specific shopping list. Only if it belongs to the authenticated user.
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

    const list = await db.shoppingList.findUnique({
      where: { id, userId },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    let items = [];
    try {
      items = JSON.parse(list.itemsJson);
    } catch {
      items = [];
    }

    return NextResponse.json({
      list: {
        ...list,
        items,
      },
    });
  } catch (error) {
    console.error("[GET /api/lists/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lists/[id]
 * Update a shopping list. Only if it belongs to the authenticated user.
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
    const body = await request.json();

    const parsed = updateListSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, items, isDefault } = parsed.data;

    const existing = await db.shoppingList.findUnique({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (items !== undefined) {
      updateData.itemsJson = JSON.stringify(items);
    }

    if (isDefault !== undefined && isDefault) {
      // Unset other default lists for the user
      await db.shoppingList.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updatedList = await db.shoppingList.update({
      where: { id },
      data: updateData,
    });

    let parsedItems = [];
    try {
      parsedItems = JSON.parse(updatedList.itemsJson);
    } catch {
      parsedItems = [];
    }

    return NextResponse.json({
      list: {
        ...updatedList,
        items: parsedItems,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/lists/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lists/[id]
 * Delete a shopping list. Only if it belongs to the authenticated user.
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

    const list = await db.shoppingList.findUnique({
      where: { id, userId },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    await db.shoppingList.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "List deleted successfully",
      listId: id,
    });
  } catch (error) {
    console.error("[DELETE /api/lists/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
