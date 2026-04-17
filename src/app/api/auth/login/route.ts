/**
 * Smart Shop - Login API
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  comparePassword,
  sessionCookie,
  generateSessionToken,
} from "@/lib/auth-utils";
import { z } from "zod/v4";

const loginSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Check password (allow demo users without passwordHash)
    if (user.passwordHash) {
      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Email ou mot de passe incorrect" },
          { status: 401 }
        );
      }
    } else {
      // Demo user without password - accept any password for demo mode
      // In production, you'd want to migrate these users
    }

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
          avatarUrl: user.avatarUrl,
        },
      },
      {
        headers: {
          "Set-Cookie": `${sessionCookie.name}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionCookie.maxAge}`,
        },
      }
    );
  } catch (error) {
    console.error("[POST /api/auth/login] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
