import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { hashToken } from "@/lib/tokens";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rateLimit";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type TokenStatus =
  | { valid: true; userId: number; tokenId: number }
  | { valid: false; reason: "invalid" | "used" | "expired" };

async function resolveToken(rawToken: string): Promise<TokenStatus> {
  if (!rawToken || typeof rawToken !== "string") {
    return { valid: false, reason: "invalid" };
  }
  const tokenHash = await hashToken(rawToken);
  const row = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.tokenHash, tokenHash),
  });
  if (!row) return { valid: false, reason: "invalid" };
  if (row.usedAt) return { valid: false, reason: "used" };
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true, userId: row.userId, tokenId: row.id };
}

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token") || "";
  const status = await resolveToken(rawToken);
  if (status.valid) {
    return NextResponse.json({ valid: true });
  }
  return NextResponse.json({ valid: false, reason: status.reason });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = await checkRateLimit(RATE_LIMITS.resetPassword, ip);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Too many requests. Try again in ${Math.ceil(
            limit.retryAfterSeconds / 60
          )} minute(s).`,
        },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const status = await resolveToken(token);
    if (!status.valid) {
      const message =
        status.reason === "expired"
          ? "This reset link has expired. Please request a new one."
          : status.reason === "used"
            ? "This reset link has already been used."
            : "Invalid reset link.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, status.userId));

    // Mark the token as consumed so it can't be reused.
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(passwordResetTokens.id, status.tokenId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
