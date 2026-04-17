/**
 * Smart Shop - Login API
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  comparePassword,
  generateSessionToken,
  buildSessionCookie,
  SESSION_MAX_AGE,
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

    // Require a password hash — no bypass for demo users
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Ce compte utilise l'authentification legacy. Veuillez réinitialiser votre mot de passe ou créer un nouveau compte." },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Create session token and store it in database
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    await db.authSession.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          budgetDefault: user.budgetDefault,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      },
      {
        headers: {
          "Set-Cookie": buildSessionCookie(token),
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
