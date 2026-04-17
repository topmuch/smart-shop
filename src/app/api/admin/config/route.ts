/**
 * Smart Shop - Admin Config API
 * GET /api/admin/config — Retrieve all app configuration
 * PUT /api/admin/config — Update configuration values
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin-auth";
import { z } from "zod/v4";

export const dynamic = "force-dynamic";

// ---------- GET ----------

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Authentification administrateur requise" },
        { status: 401 }
      );
    }

    const configs = await db.appConfig.findMany({
      orderBy: { key: "asc" },
    });

    // Return as a simple key-value map
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    return NextResponse.json({
      config: configMap,
    });
  } catch (error) {
    console.error("[GET /api/admin/config] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// ---------- PUT ----------

const updateConfigSchema = z.object({
  key: z.string().min(1, "La clé est requise"),
  value: z.string(),
});

const batchUpdateSchema = z.object({
  entries: z.array(updateConfigSchema).min(1, "Au moins une entrée est requise"),
});

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Authentification administrateur requise" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Support both single and batch update
    let entries: Array<{ key: string; value: string }>;

    if (Array.isArray(body)) {
      entries = body;
    } else if (body.entries && Array.isArray(body.entries)) {
      const parsed = batchUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Données invalides" },
          { status: 400 }
        );
      }
      entries = parsed.data.entries;
    } else {
      const parsed = updateConfigSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Données invalides" },
          { status: 400 }
        );
      }
      entries = [parsed.data];
    }

    const results = await Promise.all(
      entries.map(({ key, value }) =>
        db.appConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    return NextResponse.json({
      success: true,
      updated: results.map((r) => ({ key: r.key, value: r.value })),
    });
  } catch (error) {
    console.error("[PUT /api/admin/config] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
