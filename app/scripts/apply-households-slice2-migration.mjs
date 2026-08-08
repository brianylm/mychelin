#!/usr/bin/env node
// Applies drizzle/0029_households_slice2.sql to the DEV Turso database
// and verifies the Slice 2 schema landed. Idempotent — duplicate/exists
// errors are treated as "already applied".
//
// Usage (from app/):
//   node scripts/apply-households-slice2-migration.mjs
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

const sql = readFileSync("drizzle/0029_households_slice2.sql", "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter(Boolean);

function isDuplicateError(e) {
  const msg = String(e?.message ?? e).toLowerCase();
  return msg.includes("duplicate") || msg.includes("already exists");
}

console.log(`Applying ${statements.length} statements from drizzle/0029_households_slice2.sql...`);
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

// Verify: shopping_list_items table + new columns.
const { rows } = await client.execute(
  "SELECT name FROM sqlite_master WHERE name IN ('shopping_list_items')"
);
const hasTable = rows.length === 1;
const invCols = await client.execute("PRAGMA table_info(inventory)");
const hasInventoryHouseholdId = invCols.rows.some((r) => String(r.name) === "household_id");
const planCols = await client.execute("PRAGMA table_info(meal_plans)");
const planColNames = new Set(planCols.rows.map((r) => String(r.name)));

let ok = true;
console.log(`${hasTable ? "✓" : "✗"} table shopping_list_items`);
ok = ok && hasTable;
console.log(`${hasInventoryHouseholdId ? "✓" : "✗"} column inventory.household_id`);
ok = ok && hasInventoryHouseholdId;
for (const col of ["ghost_title", "ghost_yield", "ghosted_at"]) {
  const found = planColNames.has(col);
  if (!found) ok = false;
  console.log(`${found ? "✓" : "✗"} column meal_plans.${col}`);
}

if (!ok) {
  console.error("Verification FAILED");
  process.exit(1);
}
console.log("Households Slice 2 migration applied and verified.");
