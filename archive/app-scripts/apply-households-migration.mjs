#!/usr/bin/env node
// Applies drizzle/0028_households.sql to the DEV Turso database and
// verifies the household schema landed. Idempotent — duplicate/exists
// errors are treated as "already applied".
//
// Usage (from app/):
//   node scripts/apply-households-migration.mjs
//
// Reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN from .env.local / .env
// (same loader as e2e/helpers.ts). Never point this at prod creds.

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

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

const sql = readFileSync("drizzle/0028_households.sql", "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter(Boolean);

function isDuplicateError(e) {
  const msg = String(e?.message ?? e).toLowerCase();
  return msg.includes("duplicate") || msg.includes("already exists");
}

console.log(`Applying ${statements.length} statements from drizzle/0028_households.sql...`);
for (const statement of statements) {
  const label = statement.split("\n")[0].slice(0, 72);
  try {
    await client.execute(statement);
    console.log(`  ✓ ${label}`);
  } catch (e) {
    if (isDuplicateError(e)) {
      console.log(`  - ${label} (already applied)`);
    } else {
      console.error(`  ✗ ${label}: ${e?.message ?? e}`);
      process.exit(1);
    }
  }
}

// Verify: four new tables + meal_plans.household_id.
const { rows } = await client.execute(
  "SELECT name FROM sqlite_master WHERE name IN ('households','household_members','household_activity_log','household_member_blocks')"
);
const tables = new Set(rows.map((r) => String(r.name)));
const cols = await client.execute("PRAGMA table_info(meal_plans)");
const hasHouseholdId = cols.rows.some((r) => String(r.name) === "household_id");

let ok = true;
for (const t of ["households", "household_members", "household_activity_log", "household_member_blocks"]) {
  const found = tables.has(t);
  if (!found) ok = false;
  console.log(`${found ? "✓" : "✗"} table ${t}`);
}
if (!hasHouseholdId) ok = false;
console.log(`${hasHouseholdId ? "✓" : "✗"} column meal_plans.household_id`);

if (!ok) {
  console.error("Verification FAILED");
  process.exit(1);
}
console.log("Households migration applied and verified.");
