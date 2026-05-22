import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";
import { getUserFromDb } from "@/lib/auth";
import { generateResetToken, hashToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rateLimit";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// Tokens expire 1 hour after they're issued.
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;

function getBaseUrl(request: NextRequest): string {
  // On preview deploys, always use the request origin so email links point
  // at the preview URL (where the /reset-password page actually exists) and
  // not at production. NEXT_PUBLIC_BASE_URL is canonical only for production.
  const isPreview = process.env.VERCEL_ENV === "preview";

  if (!isPreview) {
    const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
  }

  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
}

export async function POST(request: NextRequest) {
  // Always return the same response shape regardless of whether the email is
  // registered — this prevents account enumeration.
  const genericResponse = NextResponse.json({ success: true });

  try {
    // Rate limit by IP to prevent email flooding. Returns 429 on breach —
    // this doesn't leak user existence (the 429 fires before we ever look
    // up the email), but it does stop someone from pounding the endpoint.
    const ip = getClientIp(request);
    const limit = await checkRateLimit(RATE_LIMITS.forgotPassword, ip);
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

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return genericResponse;
    }

    const normalized = email.toLowerCase().trim();
    const user = await getUserFromDb(normalized);
    if (!user) {
      return genericResponse;
    }

    const rawToken = generateResetToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString();

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const baseUrl = getBaseUrl(request);
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail(user.email, resetUrl, user.name);

    return genericResponse;
  } catch (err) {
    console.error("Forgot password error:", err);
    // Still return the generic response — never leak internal state.
    return genericResponse;
  }
}
