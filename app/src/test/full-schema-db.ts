// Test-only helper: a throwaway libsql file database with the whole app
// schema (generated from src/db/schema.ts by drizzle-kit) plus the known
// production quirks that schema.ts does not describe. Foreign keys are
// enforced, as on Turso. Never import this from app code.
import type { Client } from "@libsql/client";

// Production book_tips still points at a legacy recipe_books table that no
// longer exists, so any write to book_tips fails while foreign keys are on.
const PROD_BOOK_TIPS_DDL = `CREATE TABLE book_tips (
  id text PRIMARY KEY NOT NULL,
  book_id text NOT NULL,
  content text NOT NULL,
  added_by text NOT NULL,
  created_at integer NOT NULL,
  FOREIGN KEY (book_id) REFERENCES recipe_books(id) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (added_by) REFERENCES users(id) ON UPDATE no action ON DELETE no action
)`;

const PROD_WAITLIST_DDL = `CREATE TABLE IF NOT EXISTS waitlist (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  email text NOT NULL UNIQUE,
  source text,
  created_at text NOT NULL
)`;

export function tempDbUrl(label: string): string {
  const rand = Math.random().toString(36).slice(2);
  return `file:${process.env.TMPDIR || "/tmp"}/mychelin-${label}-${process.pid}-${rand}.db`;
}

export async function applyFullSchema(client: Client): Promise<void> {
  const api = await import("drizzle-kit/api");
  const schema = await import("@/db/schema");
  const empty = await api.generateSQLiteDrizzleJson({});
  const current = await api.generateSQLiteDrizzleJson(schema as Record<string, unknown>);
  const statements = await api.generateSQLiteMigration(empty, current);
  for (const statement of statements) await client.execute(statement);
  await client.execute("DROP TABLE IF EXISTS book_tips");
  await client.execute(PROD_BOOK_TIPS_DDL);
  await client.execute(PROD_WAITLIST_DDL);
  await client.execute("PRAGMA foreign_keys = ON");
}

// Empties every table. Foreign keys are off during the wipe, so order does
// not matter.
export async function wipeAllTables(client: Client): Promise<void> {
  const rows = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'"
  );
  await client.execute("PRAGMA foreign_keys = OFF");
  for (const row of rows.rows) {
    await client.execute(`DELETE FROM "${String(row.name)}"`);
  }
  await client.execute("PRAGMA foreign_keys = ON");
}

export async function count(client: Client, table: string, where = "1=1", args: (string | number | null)[] = []) {
  const r = await client.execute({ sql: `SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`, args });
  return Number(r.rows[0].n);
}
