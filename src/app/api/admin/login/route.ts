/**
 * Smart Shop - Admin Login API
 * POST /api/admin/login
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword } from "@/lib/auth-utils";
import { buildAdminCookie } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per IP per 15 minutes
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rlKey = `admin-login:${clientIp}`;
    const rl = rateLimit(rlKey, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Find admin by email
    const admin = await db.adminUser.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (!admin.isActive) {
      return NextResponse.json(
        { error: "Votre compte administrateur a été désactivé" },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await comparePassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await db.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json(
      {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          lastLoginAt: new Date(),
        },
      },
      {
        headers: {
          "Set-Cookie": buildAdminCookie(admin.id),
        },
      }
    );
  } catch (error) {
    console.error("[POST /api/admin/login] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
