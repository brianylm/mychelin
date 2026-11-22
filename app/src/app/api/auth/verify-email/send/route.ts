import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  emailLinkBaseUrl,
  getEmailVerified,
  issueEmailVerification,
} from "@/lib/email-verification";
import { canEmailAnyAddress } from "@/lib/email";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rateLimit";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// Resends the verification link to the signed-in user's current address.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((await getEmailVerified(user.id)) === true) {
      return NextResponse.json({ alreadyVerified: true });
    }

    if (!canEmailAnyAddress()) {
      return NextResponse.json(
        { error: "Email verification isn't available yet." },
        { status: 503 }
      );
    }

    for (const [config, scope] of [
      [RATE_LIMITS.verifyEmailSendUser, String(user.id)],
      [RATE_LIMITS.verifyEmailSendIp, getClientIp(request)],
    ] as const) {
      const limit = await checkRateLimit(config, scope);
      if (!limit.allowed) {
        return NextResponse.json(
          {
            error: `Too many emails. Try again in ${Math.ceil(
              limit.retryAfterSeconds / 60
            )} minute(s).`,
          },
          { status: 429, headers: rateLimitHeaders(limit) }
        );
      }
    }

    const sent = await issueEmailVerification(user, emailLinkBaseUrl(request));
    if (!sent) {
      return NextResponse.json({ error: "Couldn't send the email. Please try again later." }, { status: 502 });
    }
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json({ error: "Couldn't send the email. Please try again later." }, { status: 502 });
  }
}
