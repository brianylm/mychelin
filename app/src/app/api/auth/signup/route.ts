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

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST(request: NextRequest) {
  try {
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

    const { name, email, password } = await request.json();
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

    return NextResponse.json(
      { user: authUser, message: "Account created" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
