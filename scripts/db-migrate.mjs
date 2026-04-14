#!/usr/bin/env node
// Idempotent Turso migration runner.
//
// - Reads migration SQL files from mychelin-1/drizzle/NNNN_*.sql
// - Tracks applied migrations in a schema_migrations table on the DB
// - For each unseen migration, runs its statements (split on Drizzle's
//   statement-breakpoint marker) and records the name on success
// - Tolerates "already exists" errors so first run against a prod DB
//   that was partially migrated by hand doesn't blow up
//
// Intended to run from GitHub Actions with TURSO_DATABASE_URL and
// TURSO_AUTH_TOKEN in the environment.

import { createClient } from "@libsql/client";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "..", "mychelin-1", "drizzle");

// Errors we treat as "already applied, safely skip" — these happen when
// a statement tries to create something that already exists in the DB
// because it was applied manually before this script ran.
const BENIGN_ERROR_PATTERNS = [
  /already exists/i,
  /duplicate column name/i,
];

function isBenignError(err) {
  const msg = String(err?.message || err);
  return BENIGN_ERROR_PATTERNS.some((re) => re.test(msg));
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("✗ TURSO_DATABASE_URL is not set");
    process.exit(1);
  }
  if (!authToken) {
    console.error("✗ TURSO_AUTH_TOKEN is not set");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  // Bootstrap the tracking table.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  // Self-heal for PR #40 fallout: migration 0014_expand_ingredient_catalog
  // was falsely recorded as applied by the previous (buggy) parser, even
  // though zero statements actually ran. Detect the stale state by checking
  // whether "Sweet potato" — a canary row from the first INSERT block in
  // that migration — is present in ingredient_catalog. If the migration is
  // recorded but the canary is missing, clear the stale record so the
  // (now-fixed) parser re-runs it on the current invocation.
  //
  // This block is idempotent: once 0014 has been properly applied, the
  // canary check returns true and the DELETE is skipped. Safe to leave in
  // place long-term; not a one-shot hack.
  try {
    const stale = await client.execute({
      sql: `
        SELECT 1
        FROM schema_migrations m
        WHERE m.name = ?
          AND NOT EXISTS (
            SELECT 1 FROM ingredient_catalog WHERE name = 'Sweet potato'
          )
        LIMIT 1
      `,
      args: ["0014_expand_ingredient_catalog.sql"],
    });
    if (stale.rows.length > 0) {
      await client.execute({
        sql: "DELETE FROM schema_migrations WHERE name = ?",
        args: ["0014_expand_ingredient_catalog.sql"],
      });
      console.log(
        "🩹 self-heal: cleared stale 0014_expand_ingredient_catalog.sql record (canary 'Sweet potato' was missing)"
      );
    }
  } catch (err) {
    // ingredient_catalog may not exist yet on a very fresh DB. Safe to ignore.
    console.warn(
      "self-heal skipped:",
      err instanceof Error ? err.message : err
    );
  }

  // Read already-applied migration names.
  const appliedResult = await client.execute("SELECT name FROM schema_migrations");
  const applied = new Set(appliedResult.rows.map((r) => r.name));
  console.log(`ℹ  ${applied.size} migration(s) already recorded as applied`);

  // Find all migration files, sorted by filename (NNNN_*.sql).
  const allFiles = await readdir(MIGRATIONS_DIR);
  const migrationFiles = allFiles
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();

  console.log(`ℹ  found ${migrationFiles.length} migration file(s)`);

  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      console.log(`✓ ${file}: already recorded, skipping`);
      skippedCount++;
      continue;
    }

    const fullPath = join(MIGRATIONS_DIR, file);
    const content = await readFile(fullPath, "utf-8");

    // Parse into executable statements. Drizzle separates multi-statement
    // migrations with a "--> statement-breakpoint" marker; we also split on
    // bare semicolons as a fallback. For each candidate, strip comment-only
    // lines from inside the statement so section headers like
    // `-- ─── Additional vegetables ───` don't cause the underlying SQL to
    // be dropped. Then trim and keep only non-empty candidates.
    const statements = content
      .split(/-->\s*statement-breakpoint/g)
      .flatMap((chunk) => chunk.split(/;\s*$/m))
      .map((stmt) =>
        stmt
          .split("\n")
          .filter((line) => !/^\s*--/.test(line))
          .join("\n")
          .trim()
      )
      .filter((s) => s.length > 0);

    // Defensive guard: if a migration parses to zero statements, don't
    // record it as applied. That would be a parser bug — we want the next
    // run (after a fix is deployed) to pick it up fresh.
    if (statements.length === 0) {
      console.warn(
        `⚠  ${file}: no executable statements found after parsing. Not recording as applied.`
      );
      continue;
    }

    console.log(`→ ${file}: running ${statements.length} statement(s)`);

    let allOk = true;
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (err) {
        if (isBenignError(err)) {
          console.log(`  · skipped (already applied): ${firstLine(stmt)}`);
        } else {
          console.error(`  ✗ error on: ${firstLine(stmt)}`);
          console.error(`    ${err.message}`);
          allOk = false;
          break;
        }
      }
    }

    if (!allOk) {
      console.error(`✗ ${file}: failed, stopping`);
      process.exit(1);
    }

    // Record the migration as applied, regardless of whether statements ran
    // or were skipped as benign — the intent is "this file is now
    // incorporated into the DB state".
    await client.execute({
      sql: "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)",
      args: [file, new Date().toISOString()],
    });
    console.log(`✓ ${file}: recorded`);
    appliedCount++;
  }

  console.log("");
  console.log("=== Summary ===");
  console.log(`Applied this run: ${appliedCount}`);
  console.log(`Already applied:  ${skippedCount}`);
}

function firstLine(stmt) {
  return stmt.split("\n")[0].substring(0, 80);
}

main().catch((err) => {
  console.error("✗ unexpected error:", err);
  process.exit(1);
});
