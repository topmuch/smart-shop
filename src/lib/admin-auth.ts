/**
 * Smart Shop - Admin Auth Utilities
 * Signature-based admin cookie management.
 * Cookie value format: adminId:signature
 * Signature = HMAC-SHA256(adminId + ADMIN_SECRET)
 */

import crypto from "crypto";
import { db } from "@/lib/db";

export const ADMIN_COOKIE_NAME = "smartshop_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Secret used to sign admin cookies — falls back to a default for dev */
const ADMIN_SECRET =
  process.env.ADMIN_SECRET || "smartshop_admin_dev_secret_2024";

/** Generate HMAC-SHA256 signature for an admin id */
function signAdminId(adminId: string): string {
  return crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(adminId)
    .digest("hex");
}

/** Build a Set-Cookie header value for admin session */
export function buildAdminCookie(adminId: string): string {
  const signature = signAdminId(adminId);
  const token = `${adminId}:${signature}`;
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${ADMIN_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${ADMIN_SESSION_MAX_AGE}`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/** Build a Set-Cookie header to clear the admin session */
export function buildAdminClearCookie(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${ADMIN_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Extract admin from request cookie.
 * Returns null if cookie is missing, invalid, or admin is inactive.
 */
export async function getAdminFromRequest(request: Request): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
} | null> {
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const match = cookieHeader.match(
      new RegExp(`${ADMIN_COOKIE_NAME}=([^;]+)`)
    );
    if (!match) return null;

    const raw = match[1];
    const colonIndex = raw.lastIndexOf(":");
    if (colonIndex === -1) return null;

    const adminId = raw.substring(0, colonIndex);
    const providedSignature = raw.substring(colonIndex + 1);

    // Verify signature
    const expectedSignature = signAdminId(adminId);
    if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
      return null;
    }

    // Look up admin in database
    const admin = await db.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin || !admin.isActive) return null;

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  } catch {
    return null;
  }
}
