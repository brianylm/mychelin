import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserOAuthColumns } from "@/db/ensure-schema";
import { buildClearAuthCookieHeaders, clearAuthCookie, getCurrentUser, verifyPassword } from "@/lib/auth";
import { deleteAccountData } from "@/lib/account-deletion";
import { checkRateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rateLimit";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/account/delete ──────────────────────────────
// Permanently deletes the signed-in account. Re-authentication: the current
// password, or for accounts created with Google (no password they know) the
// account's email address typed exactly. A Google account that later set a
// password through "Forgot password" may use either.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const limit = await checkRateLimit(RATE_LIMITS.accountDelete, String(currentUser.id));
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
        },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { password?: unknown; email?: unknown }
      | null;
    const password = typeof body?.password === "string" ? body.password : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    await ensureUserOAuthColumns();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        authProvider: users.authProvider,
      })
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const passwordOk = password !== "" && (await verifyPassword(password, user.passwordHash));
    const emailOk =
      user.authProvider === "google" &&
      email !== "" &&
      email.toLowerCase() === user.email.toLowerCase();
    if (!passwordOk && !emailOk) {
      return NextResponse.json(
        {
          error:
            user.authProvider === "google"
              ? "That email doesn't match your account."
              : "That password isn't right.",
        },
        { status: 403 }
      );
    }

    const summary = await deleteAccountData({ id: user.id, email: user.email });
    // User id only: no name, email or content in logs.
    console.info("account deleted", {
      userId: user.id,
      recipes: summary.recipes,
      books: summary.booksDeleted,
      blobsDeleted: summary.blobs.deleted,
      blobsFailed: summary.blobs.failed,
    });

    // Same cookie clearing as logout: raw headers so every domain variant
    // of the auth cookie expires.
    const host = request.headers.get("host") || undefined;
    await clearAuthCookie(host);
    const response = NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
    for (const cookie of buildClearAuthCookieHeaders(host)) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch (error) {
    console.error("POST /api/account/delete error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "We couldn't finish deleting your account. Please try again." },
      { status: 500 }
    );
  }
}
