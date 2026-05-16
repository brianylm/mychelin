import { NextRequest, NextResponse } from "next/server";
import {
  getUserFromDb,
  verifyPassword,
  setAuthCookie,
  type AuthUser,
} from "@/lib/auth";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rateLimit";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = await checkRateLimit(RATE_LIMITS.login, ip);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Try again in ${Math.ceil(
            limit.retryAfterSeconds / 60
          )} minute(s).`,
        },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await getUserFromDb(email.toLowerCase());
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    const host = request.headers.get("host") || undefined;
    await setAuthCookie(authUser, host);

    return NextResponse.json({ user: authUser });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
