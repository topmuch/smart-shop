/**
 * Smart Shop - Admin Products API
 * GET    /api/admin/products  — List products (paginated, searchable)
 * POST   /api/admin/products  — Create a product
 * PUT    /api/admin/products  — Update a product (barcode in query)
 * DELETE /api/admin/products  — Delete a product (barcode in query)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin-auth";
import { z } from "zod/v4";

export const dynamic = "force-dynamic";

// ---------- Helpers ----------

async function requireAdmin(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return null;
  }
  return admin;
}

function unauthorized() {
  return NextResponse.json(
    { error: "Authentification administrateur requise" },
    { status: 401 }
  );
}

// ---------- Schemas ----------

const createProductSchema = z.object({
  barcode: z.string().min(1, "Le code-barres est requis"),
  name: z.string().min(1, "Le nom du produit est requis"),
  price: z.number().min(0, "Le prix doit être positif"),
  category: z.string().default("Autre"),
  brand: z.string().optional(),
  imageUrl: z.string().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  category: z.string().optional(),
  brand: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ---------- GET ----------

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
    );
    const search = searchParams.get("search")?.trim() ?? "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { brand: { contains: search } },
      ];
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/products] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// ---------- POST ----------

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();

    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate barcode
    const existing = await db.product.findUnique({
      where: { barcode: data.barcode },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Un produit avec ce code-barres existe déjà" },
        { status: 409 }
      );
    }

    const product = await db.product.create({
      data: {
        barcode: data.barcode,
        name: data.name,
        price: data.price,
        category: data.category,
        brand: data.brand ?? null,
        imageUrl: data.imageUrl ?? null,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/products] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// ---------- PUT ----------

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");
    if (!barcode) {
      return NextResponse.json(
        { error: "Le paramètre 'barcode' est requis" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    // Ensure product exists
    const existing = await db.product.findUnique({
      where: { barcode },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Produit introuvable" },
        { status: 404 }
      );
    }

    const product = await db.product.update({
      where: { barcode },
      data: parsed.data,
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("[PUT /api/admin/products] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// ---------- DELETE ----------

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");
    if (!barcode) {
      return NextResponse.json(
        { error: "Le paramètre 'barcode' est requis" },
        { status: 400 }
      );
    }

    const existing = await db.product.findUnique({
      where: { barcode },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Produit introuvable" },
        { status: 404 }
      );
    }

    await db.product.delete({ where: { barcode } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/products] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
