import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userIdSchema, updateUserSchema, createDemoUserSchema } from "@/lib/validations";

/**
 * GET /api/user?userId=xxx
 * Get user profile.
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

    const user = await db.user.findUnique({
      where: { id: parsed.data.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[GET /api/user] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user
 * Update user profile (name, budgetDefault, plan).
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, name, budgetDefault, plan } = parsed.data;

    const existing = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (budgetDefault !== undefined) updateData.budgetDefault = budgetDefault;
    if (plan !== undefined) updateData.plan = plan;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[PATCH /api/user] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user
 * Create a demo user if none exists.
 */
export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // No body sent — use defaults
    }

    const parsed = createDemoUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name } = parsed.data;

    // Check if a user already exists (with the given email or any user)
    if (email) {
      const existingByEmail = await db.user.findUnique({
        where: { email },
      });
      if (existingByEmail) {
        return NextResponse.json(
          { user: existingByEmail, message: "User already exists" },
          { status: 200 }
        );
      }
    }

    // Check if any user exists at all
    const anyUser = await db.user.findFirst();
    if (anyUser && !email) {
      return NextResponse.json(
        { user: anyUser, message: "Demo user already exists" },
        { status: 200 }
      );
    }

    const user = await db.user.create({
      data: {
        email: email ?? `demo_${Date.now()}@smartshop.app`,
        name: name ?? "Utilisateur Demo",
        plan: "free",
        budgetDefault: 100,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/user] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
