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

    // Drizzle separates multi-statement migrations with a comment marker.
    // Also split on bare semicolons as a fallback, and strip comment-only
    // lines to avoid "empty statement" errors.
    const statements = content
      .split(/-->\s*statement-breakpoint/g)
      .flatMap((chunk) =>
        chunk
          .split(/;\s*$/m)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !/^--/.test(s.split("\n")[0]))
      )
      .filter((s) => s.length > 0);

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
