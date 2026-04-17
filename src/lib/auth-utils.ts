/**
 * Smart Shop - Auth Utilities
 * Session token generation, password hashing, and cookie management.
 */

import crypto from "crypto";

export const SESSION_COOKIE_NAME = "smartshop_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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

/** Build a Set-Cookie header value with proper flags */
export function buildSessionCookie(token: string, maxAge: number = SESSION_MAX_AGE): string {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/** Build a Set-Cookie header to clear the session */
export function buildClearCookie(): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}
