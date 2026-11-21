import { NextResponse } from "next/server";
import {
  checkRateLimit,
  rateLimitHeaders,
  RATE_LIMITS,
  type RateLimitResult,
} from "@/lib/rateLimit";

export const AI_LIMIT_MESSAGE =
  "You've hit the AI usage limit for now. Try again in a bit.";

/**
 * Per-user AI limit check. Returns a 429 Response when limited, otherwise
 * null. `transcribe` uses the higher transcription presets. Fails open if the
 * limiter DB is unavailable so a limiter outage doesn't take AI features down.
 * The 429 carries code "quota" so the capture client reuses its existing
 * usage-limit path.
 */
export async function enforceAiLimit(
  userId: number | string,
  kind: "ai" | "transcribe" = "ai"
): Promise<NextResponse | null> {
  const configs =
    kind === "transcribe"
      ? [RATE_LIMITS.aiTranscribe, RATE_LIMITS.aiTranscribeDaily]
      : [RATE_LIMITS.ai, RATE_LIMITS.aiDaily];
  for (const config of configs) {
    let result: RateLimitResult;
    try {
      result = await checkRateLimit(config, `user:${userId}`);
    } catch (error) {
      console.error("AI rate limit check failed (allowing):", error);
      return null;
    }
    if (!result.allowed) {
      return NextResponse.json(
        { error: AI_LIMIT_MESSAGE, code: "quota" },
        { status: 429, headers: rateLimitHeaders(result) }
      );
    }
  }
  return null;
}
