// Lazy, idempotent schema fixups. These run at the top of routes that
// depend on the migration having been applied. Once the ALTER succeeds
// once in the database, subsequent calls are cheap no-ops because the
// duplicate-column error is swallowed.
//
// This exists because this project does not auto-run Drizzle migrations
// on deploy — they have to be applied manually against Turso. Rather
// than block features on that manual step, the routes that need the
// schema change bring it along themselves.

import { createClient } from "@libsql/client/web";

let versionLabelEnsured = false;
let waitlistEnsured = false;

export async function ensureWaitlistTable(): Promise<void> {
  if (waitlistEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  try {
    await client.execute(
      `CREATE TABLE IF NOT EXISTS waitlist (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        email text NOT NULL,
        source text,
        created_at text NOT NULL
      )`
    );
    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_unique ON waitlist (email)`
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("ensureWaitlistTable:", msg);
  }

  waitlistEnsured = true;
}

export async function ensureVersionLabelColumn(): Promise<void> {
  if (versionLabelEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  try {
    await client.execute(`ALTER TABLE recipe_versions ADD COLUMN version_label text`);
  } catch (e: any) {
    const msg = String(e?.message ?? "").toLowerCase();
    if (!msg.includes("duplicate") && !msg.includes("already exists")) {
      // Unknown error — log it but don't block the request. Worst case
      // the downstream insert will surface a clearer error.
      console.warn("ensureVersionLabelColumn:", e?.message ?? e);
    }
  }

  // Best-effort backfill of any rows missing a label. Cheap after the
  // first run because the WHERE clause matches nothing.
  try {
    await client.execute(
      `UPDATE recipe_versions SET version_label = CAST(version_number AS TEXT) WHERE version_label IS NULL`
    );
  } catch {
    /* ignore */
  }

  versionLabelEnsured = true;
}
