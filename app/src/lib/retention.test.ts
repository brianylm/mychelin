// Retention deletes only rows past their cut-offs.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const { tempDbUrl } = await import("@/test/full-schema-db");
  const client = createClient({ url: tempDbUrl("retention") });
  return { db: drizzle(client, { schema }), __client: client };
});

import { applyFullSchema, wipeAllTables } from "@/test/full-schema-db";
import { runRetention } from "./retention";

const NOW = new Date("2026-11-24T02:00:00.000Z");
const ago = (days: number, hours = 0) =>
  new Date(NOW.getTime() - (days * 24 + hours) * 60 * 60 * 1000).toISOString();
const ahead = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

let client: Client;

async function keys(table: string, column: string): Promise<string[]> {
  const r = await client.execute(`SELECT ${column} AS k FROM ${table} ORDER BY ${column}`);
  return r.rows.map((row) => String(row.k));
}

beforeAll(async () => {
  client = ((await import("@/db")) as unknown as { __client: Client }).__client;
  await applyFullSchema(client);
}, 60_000);

beforeEach(async () => {
  await wipeAllTables(client);
  vi.spyOn(console, "info").mockImplementation(() => {});
  await client.execute({
    sql: "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (1, 'U', 'u@example.test', 'x', ?)",
    args: [ago(400)],
  });
  // A 1-day window that started 3 days + 1 hour ago ended over 2 days ago.
  for (const [key, start] of [
    ["old-day-window", ago(3, 1)],
    ["recent-day-window", ago(2, 12)],
    ["current", ago(0, 1)],
  ]) {
    await client.execute({
      sql: "INSERT INTO auth_rate_limits (key, count, window_start, updated_at) VALUES (?, 1, ?, ?)",
      args: [key, start, start],
    });
  }
  const token = (table: string, hash: string, expires: string, used: string | null, extra = "") =>
    client.execute({
      sql: `INSERT INTO ${table} (user_id, token_hash, expires_at, used_at, created_at${extra ? ", email" : ""}) VALUES (1, ?, ?, ?, ?${extra ? ", ?" : ""})`,
      args: extra ? [hash, expires, used, ago(30), extra] : [hash, expires, used, ago(30)],
    });
  for (const [table, extra] of [["password_reset_tokens", ""], ["email_verification_tokens", "u@example.test"]] as const) {
    await token(table, `${table}-expired-long-ago`, ago(8), null, extra);
    await token(table, `${table}-used-long-ago`, ahead(1), ago(8), extra);
    await token(table, `${table}-expired-recently`, ago(6), null, extra);
    await token(table, `${table}-used-recently`, ago(1), ago(6), extra);
    await token(table, `${table}-live`, ahead(1), null, extra);
  }
  for (const [name, at] of [["older-than-a-year", ago(366)], ["eleven-months", ago(330)], ["today", ago(0)]]) {
    await client.execute({
      sql: "INSERT INTO usage_events (user_id, event_name, created_at) VALUES (NULL, ?, ?)",
      args: [name, at],
    });
  }
});

describe("runRetention", () => {
  it("deletes only rows past their cut-offs", async () => {
    const result = await runRetention(NOW);
    expect(result).toEqual({ rateLimits: 1, passwordResetTokens: 2, emailVerificationTokens: 2, usageEvents: 1 });
    expect(await keys("auth_rate_limits", "key")).toEqual(["current", "recent-day-window"]);
    for (const table of ["password_reset_tokens", "email_verification_tokens"]) {
      expect(await keys(table, "token_hash")).toEqual(
        [`${table}-expired-recently`, `${table}-live`, `${table}-used-recently`]
      );
    }
    expect(await keys("usage_events", "event_name")).toEqual(["eleven-months", "today"]);
  });

  it("is a no-op the second time", async () => {
    await runRetention(NOW);
    expect(await runRetention(NOW)).toEqual({ rateLimits: 0, passwordResetTokens: 0, emailVerificationTokens: 0, usageEvents: 0 });
  });
});
