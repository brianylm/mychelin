#!/usr/bin/env node
// Rebuilds the `recipes` table on the DEV Turso database (from .env.local)
// to drop the spurious `forked_from REFERENCES recipes(id)` FK, using
// drizzle/0031_drop_recipes_forked_from_fk.sql.
//
// Dry-run by default: runs the whole rebuild inside a transaction, verifies
// the result, then ROLLS BACK. Pass `--commit` to actually apply.
//
//   node scripts/rebuild-recipes-drop-fork-fk.mjs          # dry run
//   node scripts/rebuild-recipes-drop-fork-fk.mjs --commit # apply
//
// Safety: FK enforcement is turned OFF for the DROP, then restored. A full
// JSON backup should exist first (see backup-recipes-and-refs.mjs).

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const COMMIT = process.argv.includes("--commit");

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set (check .env.local / .env)");
  process.exit(1);
}
const client = createClient({ url, authToken });

const sql = readFileSync("drizzle/0031_drop_recipes_forked_from_fk.sql", "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter(Boolean);

const before = {
  recipeCount: Number(
    (await client.execute("SELECT count(*) AS n FROM recipes")).rows[0].n
  ),
  attemptsCount: Number(
    (await client.execute("SELECT count(*) AS n FROM recipe_attempts")).rows[0].n
  ),
  seq: Number(
    (
      await client.execute(
        "SELECT seq FROM sqlite_sequence WHERE name = 'recipes'"
      )
    ).rows[0]?.seq
  ),
};

console.log(`[${COMMIT ? "COMMIT" : "DRY RUN (will roll back)"}] rebuilding recipes...`);
console.log(`  recipes rows: ${before.recipeCount}, attempts rows: ${before.attemptsCount}, sequence: ${before.seq}`);

// PRAGMA foreign_keys must be toggled outside the transaction.
await client.execute("PRAGMA foreign_keys = OFF");
try {
  await client.execute("BEGIN");
  for (const statement of statements) {
    const label = statement.split("\n")[0].slice(0, 60);
    try {
      await client.execute(statement);
      console.log(`  ✓ ${label}`);
    } catch (e) {
      console.error(`  ✗ ${label}: ${e?.message ?? e}`);
      await client.execute("ROLLBACK").catch(() => {});
      throw e;
    }
  }

  // ── Verify inside the transaction, before committing ──────────
  const fk = await client.execute("PRAGMA foreign_key_list(recipes)");
  const stillHasFk = fk.rows.some(
    (r) => String(r.from) === "forked_from" && String(r.table) === "recipes"
  );
  const after = {
    recipeCount: Number(
      (await client.execute("SELECT count(*) AS n FROM recipes")).rows[0].n
    ),
    attemptsCount: Number(
      (await client.execute("SELECT count(*) AS n FROM recipe_attempts")).rows[0].n
    ),
    seq: Number(
      (await client.execute("SELECT seq FROM sqlite_sequence WHERE name = 'recipes'"))
        .rows[0]?.seq
    ),
    fkCheck: (await client.execute("PRAGMA foreign_key_check")).rows.length,
  };
  console.log("  verify:");
  console.log(`    recipes rows: ${after.recipeCount} (${after.recipeCount === before.recipeCount ? "OK" : "MISMATCH!"})`);
  console.log(`    attempts rows: ${after.attemptsCount} (${after.attemptsCount === before.attemptsCount ? "OK" : "MISMATCH!"})`);
  console.log(`    sequence: ${after.seq} (${after.seq === before.seq ? "OK" : "CHANGED"})`);
  console.log(`    forked_from->recipes FK: ${stillHasFk ? "STILL PRESENT!" : "removed (OK)"}`);
  console.log(`    foreign_key_check violations: ${after.fkCheck}`);

  const clean =
    after.recipeCount === before.recipeCount &&
    after.attemptsCount === before.attemptsCount &&
    after.seq === before.seq &&
    !stillHasFk &&
    after.fkCheck === 0;

  if (!clean) {
    await client.execute("ROLLBACK").catch(() => {});
    console.error("Verification FAILED — rolled back, DB untouched.");
    process.exit(1);
  }

  if (COMMIT) {
    await client.execute("COMMIT");
    console.log("Verified clean — COMMITTED.");
  } else {
    await client.execute("ROLLBACK");
    console.log("Verified clean — rolled back (dry run). Re-run with --commit to apply.");
  }
} catch (e) {
  console.error("Migration error:", e?.message ?? e);
  process.exit(1);
} finally {
  await client.execute("PRAGMA foreign_keys = ON");
}
