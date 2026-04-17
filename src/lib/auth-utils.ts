/**
 * Smart Shop - Auth Utilities
 * Session token generation and verification using crypto.
 */

import crypto from "crypto";

const SESSION_COOKIE_NAME = "smartshop_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Generate a secure random session token */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Hash a password using bcryptjs */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

/** Compare a password against a hash */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

/** Session cookie config */
export const sessionCookie = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
  path: "/",
};

export { SESSION_COOKIE_NAME };
