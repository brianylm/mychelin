#!/usr/bin/env node
// Backs up the full contents of `recipes` plus every table that has a
// foreign key pointing at it (plus sqlite_sequence), into a timestamped
// JSON file under scripts/.backups/. Run BEFORE any recipes rebuild.
//
// Usage (from app/):
//   node scripts/backup-recipes-and-refs.mjs

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
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
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Every non-internal table.
const tablesRes = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
);
const allTables = tablesRes.rows.map((r) => String(r.name));

// Which of them reference recipes?
const referencing = [];
for (const name of allTables) {
  if (name === "recipes") continue;
  const fks = await client.execute(`PRAGMA foreign_key_list("${name}")`);
  const pointsAt = fks.rows.some((f) => String(f.table) === "recipes");
  if (pointsAt) referencing.push(name);
}

const dump = { takenAt: new Date().toISOString(), tables: {} };
for (const name of ["recipes", ...referencing]) {
  const res = await client.execute(`SELECT * FROM "${name}"`);
  dump.tables[name] = {
    columns: res.columns,
    rows: res.rows.map((r) => {
      const o = {};
      res.columns.forEach((c, i) => (o[c] = r[res.columns[i]]));
      return o;
    }),
  };
}
// sqlite_sequence snapshot (for AUTOINCREMENT continuity).
const seqRes = await client.execute("SELECT name, seq FROM sqlite_sequence WHERE name = 'recipes'");
dump.tables["__sqlite_sequence__"] = { columns: ["name", "seq"], rows: seqRes.rows };

mkdirSync("scripts/.backups", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = join("scripts/.backups", `recipes-rebuild-${stamp}.json`);
writeFileSync(file, JSON.stringify(dump, null, 2));

console.log("Referencing recipes:", referencing.join(", ") || "(none)");
console.log(`Backup written to ${file}`);
for (const name of Object.keys(dump.tables)) {
  console.log(`  ${name}: ${dump.tables[name].rows.length} rows`);
}
