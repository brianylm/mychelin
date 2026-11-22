// Email ownership verification: issue a one-time link, and redeem it.
//
// Links are redeemed by an explicit POST (the "Confirm my email" button on
// /verify-email), never by the GET that opens the page. Mail scanners and
// link previewers open links on their own; if a GET verified, a scanner on
// the real owner's inbox could verify an account someone else registered
// with that address (and an admin address only needs a verified email).
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import { ensureEmailVerificationTokensTable, ensureUserOAuthColumns } from "@/db/ensure-schema";
import { canEmailAnyAddress, sendVerificationEmail } from "@/lib/email";
import { generateResetToken, hashToken } from "@/lib/tokens";

export const VERIFICATION_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type VerifyEmailFailure = "invalid" | "expired" | "used" | "email_changed";
export type VerifyEmailResult = { ok: true; email: string } | { ok: false; reason: VerifyEmailFailure };

/**
 * Base URL for links in emails. Production uses NEXT_PUBLIC_BASE_URL; preview
 * deploys use the request origin so the link opens the preview that sent it.
 * Same rule as forgot-password.
 */
export function emailLinkBaseUrl(request: Request): string {
  if (process.env.VERCEL_ENV !== "preview") {
    const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
  }
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
}

/**
 * Creates a fresh verification link for the user's current address and
 * emails it. Older unused links for the user stop working. Returns whether
 * the email was accepted for delivery. Throws on DB or send exceptions.
 */
export async function issueEmailVerification(
  user: { id: number; name: string; email: string },
  baseUrl: string
): Promise<boolean> {
  // No real sender configured: don't mint links nobody will receive.
  if (!canEmailAnyAddress()) return false;
  await ensureEmailVerificationTokensTable();
  const now = new Date();
  const rawToken = generateResetToken();
  const tokenHash = await hashToken(rawToken);

  await db
    .update(emailVerificationTokens)
    .set({ usedAt: now.toISOString() })
    .where(and(eq(emailVerificationTokens.userId, user.id), isNull(emailVerificationTokens.usedAt)));

  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    tokenHash,
    email: user.email,
    expiresAt: new Date(now.getTime() + VERIFICATION_TOKEN_LIFETIME_MS).toISOString(),
    createdAt: now.toISOString(),
  });

  const url = `${baseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
  return sendVerificationEmail(user.email, user.name, url);
}

/**
 * Redeems a verification link. Succeeds only for a known, unused, unexpired
 * token whose address still equals the account's email; then marks the token
 * used and the account verified. No session is needed: the link is the proof.
 */
export async function verifyEmailToken(rawToken: string): Promise<VerifyEmailResult> {
  if (!rawToken || typeof rawToken !== "string") return { ok: false, reason: "invalid" };
  await ensureEmailVerificationTokensTable();

  const tokenHash = await hashToken(rawToken);
  const row = await db.query.emailVerificationTokens.findFirst({
    where: eq(emailVerificationTokens.tokenHash, tokenHash),
  });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (new Date(row.expiresAt).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  if (!user) return { ok: false, reason: "invalid" };
  if (user.email.toLowerCase() !== row.email.toLowerCase()) return { ok: false, reason: "email_changed" };

  // Claim the token atomically so two concurrent clicks verify once.
  const claimed = await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(and(eq(emailVerificationTokens.id, row.id), isNull(emailVerificationTokens.usedAt)))
    .returning({ id: emailVerificationTokens.id });
  if (claimed.length === 0) return { ok: false, reason: "used" };

  // Guard on the address again in case the email changed in between.
  const updated = await db
    .update(users)
    .set({ emailVerified: true })
    .where(and(eq(users.id, user.id), sql`lower(${users.email}) = ${row.email.toLowerCase()}`))
    .returning({ id: users.id });
  if (updated.length === 0) return { ok: false, reason: "email_changed" };

  return { ok: true, email: user.email };
}

/**
 * What to tell the client about verification. An unverified address is only
 * reported as `false` when a real sender is configured; otherwise there is
 * nothing the user can do, so it is `undefined` and the notice stays hidden.
 */
export function clientEmailVerified(verified: boolean): boolean | undefined {
  if (verified) return true;
  return canEmailAnyAddress() ? false : undefined;
}

/** The account's verified flag; undefined when unknown (missing user or DB error). */
export async function getEmailVerified(userId: number): Promise<boolean | undefined> {
  try {
    await ensureUserOAuthColumns();
    const [row] = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) return undefined;
    return clientEmailVerified(Boolean(row.emailVerified));
  } catch (e: unknown) {
    console.error("getEmailVerified:", e instanceof Error ? e.message : String(e));
    return undefined;
  }
}
