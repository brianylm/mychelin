import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/email-verification";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rateLimit";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// Redeems a verification link. Called by the "Confirm my email" button on
// /verify-email, never by the page's GET, so link scanners can't verify.
// No session needed: possession of the emailed token is the proof.
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = await checkRateLimit(RATE_LIMITS.verifyEmail, ip);
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

    const body = await request.json().catch(() => null);
    const token = body && typeof body.token === "string" ? body.token : "";
    const result = await verifyEmailToken(token);
    if (result.ok) return NextResponse.json({ verified: true });
    return NextResponse.json({ verified: false, reason: result.reason }, { status: 400 });
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json({ error: "Couldn't verify your email" }, { status: 500 });
  }
}
