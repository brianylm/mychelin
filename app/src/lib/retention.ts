// Daily retention clean-up, run from the notifications cron
// (GET /api/notifications/dispatch). Periods are stated in /privacy; change
// both together.
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

const DAY_MS = 24 * 60 * 60 * 1000;

// Rate-limit rows: delete once their window ended more than 2 days ago. The
// longest window is 1 day, so a row whose window started over 3 days ago
// has certainly ended more than 2 days ago.
export const RATE_LIMIT_KEEP_DAYS = 2;
export const LONGEST_RATE_LIMIT_WINDOW_DAYS = 1;
// Reset and email verification links: 7 days after use or expiry.
export const TOKEN_KEEP_DAYS = 7;
// Usage analytics (anonymous after account deletion): 12 months.
export const USAGE_EVENT_KEEP_DAYS = 365;

const BATCH = 500;
// Caps one run; anything left over goes the next day.
const MAX_BATCHES = 40;

export interface RetentionResult {
  rateLimits: number;
  passwordResetTokens: number;
  emailVerificationTokens: number;
  usageEvents: number;
}

async function deleteInBatches(table: string, where: SQL): Promise<number> {
  let total = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const result = await db.run(
      sql`DELETE FROM ${sql.identifier(table)} WHERE rowid IN (SELECT rowid FROM ${sql.identifier(table)} WHERE ${where} LIMIT ${BATCH})`
    );
    const affected = Number(result.rowsAffected ?? 0);
    total += affected;
    if (affected < BATCH) break;
  }
  return total;
}

// A missing table (never created in this database) has nothing to delete.
async function safely(label: string, work: () => Promise<number>): Promise<number> {
  try {
    return await work();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/no such table/i.test(message)) console.warn(`retention: ${label} skipped:`, message);
    return 0;
  }
}

export async function runRetention(now: Date = new Date()): Promise<RetentionResult> {
  const iso = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  const rateCutoff = iso(RATE_LIMIT_KEEP_DAYS + LONGEST_RATE_LIMIT_WINDOW_DAYS);
  const tokenCutoff = iso(TOKEN_KEEP_DAYS);
  const usageCutoff = iso(USAGE_EVENT_KEEP_DAYS);

  const result: RetentionResult = {
    rateLimits: await safely("auth_rate_limits", () =>
      deleteInBatches("auth_rate_limits", sql`window_start < ${rateCutoff}`)
    ),
    passwordResetTokens: await safely("password_reset_tokens", () =>
      deleteInBatches(
        "password_reset_tokens",
        sql`(used_at IS NOT NULL AND used_at < ${tokenCutoff}) OR expires_at < ${tokenCutoff}`
      )
    ),
    emailVerificationTokens: await safely("email_verification_tokens", () =>
      deleteInBatches(
        "email_verification_tokens",
        sql`(used_at IS NOT NULL AND used_at < ${tokenCutoff}) OR expires_at < ${tokenCutoff}`
      )
    ),
    usageEvents: await safely("usage_events", () =>
      deleteInBatches("usage_events", sql`created_at < ${usageCutoff}`)
    ),
  };
  console.info("retention sweep", result);
  return result;
}
