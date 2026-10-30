// Shared fixtures for the auth scenario state machines. Not a test file.
import type { Client } from "@libsql/client";

export const USERS_DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'password',
    google_sub TEXT UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,
    cooking_skill_level TEXT,
    household_size INTEGER,
    favorite_cuisines TEXT,
    dietary_restrictions TEXT,
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    cooking_goal TEXT,
    cooking_frequency TEXT,
    first_capture_mode TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT
  );
`;

export type AccountState = "none" | "password_by_email" | "google_by_sub" | "password_unverified";

export async function resetUsers(client: Client) {
  await client.executeMultiple(USERS_DDL);
  await client.execute("DELETE FROM users");
  await client.execute("DELETE FROM password_reset_tokens");
}

/** Seed one account in the requested state for `email` / Google `sub`. */
export async function seedAccount(client: Client, state: AccountState, email: string, sub: string) {
  const now = new Date().toISOString();
  if (state === "none") return;
  if (state === "google_by_sub") {
    // Google user whose stored email differs, so only the sub can match.
    await client.execute({
      sql: "INSERT INTO users (name, email, password_hash, auth_provider, google_sub, email_verified, created_at) VALUES (?, ?, 'hashed', 'google', ?, 1, ?)",
      args: ["Google User", "old-" + email, sub, now],
    });
    return;
  }
  await client.execute({
    sql: "INSERT INTO users (name, email, password_hash, auth_provider, email_verified, created_at) VALUES (?, ?, 'hashed:secret-123', 'password', ?, ?)",
    args: ["Password User", email, state === "password_by_email" ? 1 : 0, now],
  });
}

export async function countUsers(client: Client, where = "1=1", args: (string | number)[] = []) {
  const r = await client.execute({ sql: `SELECT COUNT(*) AS n FROM users WHERE ${where}`, args });
  return Number(r.rows[0].n);
}
