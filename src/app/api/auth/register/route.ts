/**
 * Smart Shop - Register API
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, sessionCookie, generateSessionToken } from "@/lib/auth-utils";
import { z } from "zod/v4";

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Cette adresse email est déjà utilisée" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        plan: "free",
        budgetDefault: 100,
      },
    });

    // Create session token
    const token = generateSessionToken();

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          budgetDefault: user.budgetDefault,
        },
      },
      {
        status: 201,
        headers: {
          "Set-Cookie": `${sessionCookie.name}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionCookie.maxAge}`,
        },
      }
    );
  } catch (error) {
    console.error("[POST /api/auth/register] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
