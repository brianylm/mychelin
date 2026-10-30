import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setAuthCookie, type AuthUser } from "@/lib/auth";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rateLimit";
import { eq } from "drizzle-orm";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";
import { ensureUserOAuthColumns } from "@/db/ensure-schema";
import { MINIMUM_AGE } from "@/lib/legal";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, ageConfirmed } = await request.json();

    // Checked before the rate limiter so a refused request never touches the
    // database (the daily compliance monitor relies on this).
    if (ageConfirmed !== true) {
      return NextResponse.json(
        { error: `You must be ${MINIMUM_AGE} or older to create an account` },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const limit = await checkRateLimit(RATE_LIMITS.signup, ip);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Too many signup attempts. Try again in ${Math.ceil(
            limit.retryAfterSeconds / 60
          )} minute(s).`,
        },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    await ensureUserOAuthColumns();

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!name || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if email exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: normalizedEmail,
        passwordHash,
        createdAt: now,
      })
      .returning();

    const authUser: AuthUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    };

    const host = request.headers.get("host") || undefined;
    await setAuthCookie(authUser, host);

    await trackUsageEvent({
      userId: newUser.id,
      eventName: "user_signed_up",
      source: "auth",
      path: requestPath(request),
    });

    return NextResponse.json(
      { user: authUser, message: "Account created" },
      { status: 201 }
    );
  } catch (error) {
    // A double-submit can pass the existence check twice; the UNIQUE index
    // stops the second insert.
    if (isUniqueEmailViolation(error)) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

function isUniqueEmailViolation(error: unknown): boolean {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    if (/UNIQUE constraint failed: users\.email/.test(e.message)) return true;
  }
  return false;
}
