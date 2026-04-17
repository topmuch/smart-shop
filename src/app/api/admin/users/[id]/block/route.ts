/**
 * Smart Shop - Admin User Block API
 * POST /api/admin/users/[id]/block
 * Block or unblock a user by storing their status in AppConfig.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin-auth";
import { z } from "zod/v4";

export const dynamic = "force-dynamic";

const blockSchema = z.object({
  block: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Authentification administrateur requise" },
        { status: 401 }
      );
    }

    const { id: userId } = await params;

    // Check user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = blockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Le champ 'block' (booléen) est requis" },
        { status: 400 }
      );
    }

    const { block } = parsed.data;

    // Retrieve or create blocked_user_ids config entry
    const config = await db.appConfig.upsert({
      where: { key: "blocked_user_ids" },
      update: {},
      create: { key: "blocked_user_ids", value: "[]" },
    });

    const blockedIds: string[] = JSON.parse(config.value);

    if (block && !blockedIds.includes(userId)) {
      blockedIds.push(userId);
    } else if (!block) {
      const idx = blockedIds.indexOf(userId);
      if (idx !== -1) blockedIds.splice(idx, 1);
    }

    await db.appConfig.update({
      where: { key: "blocked_user_ids" },
      data: { value: JSON.stringify(blockedIds) },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      blocked: block,
    });
  } catch (error) {
    console.error("[POST /api/admin/users/[id]/block] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
