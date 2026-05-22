import { eq } from "drizzle-orm";
import { db } from "@/db";
import { authRateLimits } from "@/db/schema";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitConfig {
  /** Unique identifier for this limiter (e.g. "login", "signup"). */
  name: string;
  /** Max attempts allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/**
 * Fixed-window rate limiter backed by Turso.
 *
 * One row per (name + scope). On each check:
 *   - If no row exists → insert (count=1, windowStart=now) → allow
 *   - If the row's window has expired → reset (count=1, windowStart=now) → allow
 *   - If still within window and count < limit → increment → allow
 *   - If still within window and count >= limit → reject with retry-after
 *
 * Note: this is NOT atomic across concurrent requests. A burst could let a
 * few extra requests through beyond the nominal limit. That's acceptable for
 * auth rate limiting — the goal is to stop brute-force scanners, not to
 * enforce a hard quota. Tighten with SQL transactions if you need it stricter.
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  scope: string
): Promise<RateLimitResult> {
  const key = `${config.name}:${scope}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const nowIso = new Date(now).toISOString();

  const existing = await db.query.authRateLimits.findFirst({
    where: eq(authRateLimits.key, key),
  });

  if (!existing) {
    await db.insert(authRateLimits).values({
      key,
      count: 1,
      windowStart: nowIso,
      updatedAt: nowIso,
    });
    return {
      allowed: true,
      remaining: config.limit - 1,
      retryAfterSeconds: 0,
    };
  }

  const windowStartMs = new Date(existing.windowStart).getTime();
  const windowAgeMs = now - windowStartMs;

  // Window expired — start a fresh one.
  if (windowAgeMs >= windowMs) {
    await db
      .update(authRateLimits)
      .set({ count: 1, windowStart: nowIso, updatedAt: nowIso })
      .where(eq(authRateLimits.key, key));
    return {
      allowed: true,
      remaining: config.limit - 1,
      retryAfterSeconds: 0,
    };
  }

  // Still within window.
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowMs - windowAgeMs) / 1000)
  );

  if (existing.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  const newCount = existing.count + 1;
  await db
    .update(authRateLimits)
    .set({ count: newCount, updatedAt: nowIso })
    .where(eq(authRateLimits.key, key));

  return {
    allowed: true,
    remaining: Math.max(0, config.limit - newCount),
    retryAfterSeconds: 0,
  };
}

/**
 * Extracts a best-effort client IP from the request. Uses the leftmost IP
 * in x-forwarded-for (set by Vercel's edge network), falling back to
 * x-real-ip. Returns "unknown" if neither is present.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Build a 429 Too Many Requests response body + headers for a blocked request.
 * The caller decides the shape of the JSON (to preserve any endpoint-specific
 * anti-enumeration behavior).
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}

// ─── Config presets ────────────────────────────────────────

export const RATE_LIMITS = {
  // 5 login attempts per 15 minutes per IP. Tight enough to stop brute force,
  // loose enough that a legitimate user fumbling their password isn't locked out.
  login: { name: "login", limit: 5, windowSeconds: 15 * 60 },

  // 3 signups per hour per IP. Stops signup spam.
  signup: { name: "signup", limit: 3, windowSeconds: 60 * 60 },

  // 5 forgot-password requests per hour per IP. Prevents email flooding.
  forgotPassword: {
    name: "forgot_password",
    limit: 5,
    windowSeconds: 60 * 60,
  },

  // 10 reset-password attempts per hour per IP. Token is already random so
  // brute force is infeasible; this is just a safety net.
  resetPassword: {
    name: "reset_password",
    limit: 10,
    windowSeconds: 60 * 60,
  },

  // 5 change-password attempts per hour per user. Since the route is
  // authenticated, we scope by user id rather than IP — a household sharing
  // a NAT won't get cross-locked, and an attacker targeting a specific user
  // is still throttled.
  changePassword: {
    name: "change_password",
    limit: 5,
    windowSeconds: 60 * 60,
  },
} as const;
