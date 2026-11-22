import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, type AuthUser } from "@/lib/auth";

export function adminEmails(): Set<string> {
  const raw = process.env.ANALYTICS_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().has(email.trim().toLowerCase());
}

export async function requireAdminUser(): Promise<
  | { user: AuthUser; response?: never }
  | { user?: never; response: NextResponse }
> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isAdminEmail(currentUser.email)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  // A listed address alone proves nothing: anyone could register it first.
  // Require the account's email to be verified (the emailed confirmation
  // link, a password reset, or Google sign-in with a verified address sets
  // this), read from the database rather than trusting the token.
  const [row] = await db
    .select({ email: users.email, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, currentUser.id))
    .limit(1);
  if (!row || !row.emailVerified || !isAdminEmail(row.email)) {
    return {
      response: NextResponse.json(
        {
          error: "Forbidden",
          detail:
            "Admin access needs a verified email. Use the confirmation link we emailed, or sign in with Google once using this address.",
        },
        { status: 403 }
      ),
    };
  }
  return { user: currentUser };
}
