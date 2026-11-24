// POST /api/account/delete against the whole schema with foreign keys on.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { NextRequest } from "next/server";
import type * as schema from "@/db/schema";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const { tempDbUrl } = await import("@/test/full-schema-db");
  const client = createClient({ url: tempDbUrl("account-delete") });
  return { db: drizzle(client, { schema }), __client: client };
});
vi.mock("@/db/ensure-schema", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(
    Object.entries(real).map(([k, v]) => [k, typeof v === "function" ? vi.fn(async () => {}) : v])
  );
});
const blob = vi.hoisted(() => ({ del: vi.fn<(urls: string | string[]) => Promise<void>>(async () => {}) }));
vi.mock("@vercel/blob", () => ({ del: blob.del }));
const session = vi.hoisted(() => ({ user: null as { id: number; name: string; email: string } | null }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...real,
    getCurrentUser: vi.fn(async () => session.user),
    clearAuthCookie: vi.fn(async () => {}),
  };
});

import { applyFullSchema, count, wipeAllTables } from "@/test/full-schema-db";
import { BLOB, GOOGLE, OWNER, seedAccountFixture } from "@/test/account-fixture";
import { POST } from "./route";

let client: Client;
let db: LibSQLDatabase<typeof schema>;

beforeAll(async () => {
  const mod = (await import("@/db")) as unknown as { __client: Client; db: LibSQLDatabase<typeof schema> };
  client = mod.__client;
  db = mod.db;
  await applyFullSchema(client);
}, 60_000);

beforeEach(async () => {
  vi.restoreAllMocks();
  await wipeAllTables(client);
  await seedAccountFixture(db);
  blob.del.mockReset();
  blob.del.mockImplementation(async () => {});
  session.user = { id: OWNER.id, name: OWNER.name, email: OWNER.email };
});

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/account/delete", {
      method: "POST",
      headers: { "content-type": "application/json", host: "mychelin-sg.vercel.app" },
      body: JSON.stringify(body),
    })
  );
}

async function snapshot() {
  const tables = [
    "users", "recipes", "books", "book_members", "book_recipes", "household_members",
    "meal_plans", "inventory", "shopping_list_items", "pilot_feedback", "auth_rate_limits",
    "usage_events", "calendar_connections", "recipe_flags", "recipe_attempts",
  ];
  const out: Record<string, number> = {};
  for (const t of tables) out[t] = await count(client, t);
  return out;
}

async function expectOwnerFullyDeleted() {
  expect(await count(client, "users", "id = 1")).toBe(0);
  // Owner's recipes and everything hanging off them.
  expect(await count(client, "recipes", "user_id = 1")).toBe(0);
  for (const t of ["ingredients", "instructions", "recipe_photos", "voice_recordings", "recipe_versions", "recipe_next_tries"]) {
    expect(await count(client, t, "recipe_id IN (10, 11)")).toBe(0);
  }
  for (const t of ["recipe_flags", "recipe_attempts", "recipe_next_tries", "meal_plan_blocks", "notification_preferences", "push_subscriptions", "pilot_feedback", "password_reset_tokens", "email_verification_tokens", "calendar_connections", "book_members", "book_activity_log", "household_members", "household_activity_log"]) {
    expect(await count(client, t, "user_id = 1"), t).toBe(0);
  }
  expect(await count(client, "share_links", "created_by = 1")).toBe(0);
  // Owned book deleted for everyone; Other's book kept, without the owner.
  expect(await count(client, "books", "id = 100")).toBe(0);
  expect(await count(client, "book_members", "book_id = 100")).toBe(0);
  expect(await count(client, "books", "id = 200")).toBe(1);
  expect(await count(client, "book_members", "book_id = 200 AND user_id = 2")).toBe(1);
  // Other's recipe stays in Other's book, now credited to the book owner.
  const credited = await client.execute("SELECT added_by FROM book_recipes WHERE book_id = 200 AND recipe_id = 20");
  expect(credited.rows.map((r) => Number(r.added_by))).toEqual([2]);
  expect(await count(client, "book_recipes", "recipe_id = 11")).toBe(0);
  // Email- and id-keyed rate-limit rows gone; other people's kept.
  expect(await count(client, "auth_rate_limits", "key LIKE '%owner@example.test' OR key IN ('change_password:1', 'ai:user:1', 'account_delete:1')")).toBe(0);
  expect(await count(client, "auth_rate_limits", "key IN ('login:203.0.113.9', 'forgot_password:other@example.test', 'ai:user:11')")).toBe(3);
  // Usage analytics kept, anonymised.
  expect(await count(client, "usage_events")).toBe(3);
  expect(await count(client, "usage_events", "user_id IS NULL")).toBe(2);
  // Other user's data untouched.
  expect(await count(client, "users", "id IN (2, 3, 4)")).toBe(3);
  expect(await count(client, "recipes", "id = 20 AND user_id = 2")).toBe(1);
  expect(await count(client, "recipe_photos", "recipe_id = 20")).toBe(1);
  expect(await count(client, "recipe_flags", "user_id = 2")).toBe(1);
  expect(await count(client, "recipe_attempts", "user_id = 2")).toBe(1);
  expect(await count(client, "pilot_feedback", "user_id = 2")).toBe(1);
  expect(await count(client, "inventory", "user_id = 2")).toBe(1);
  expect(await count(client, "recipe_versions", "id = 501 AND changed_by IS NULL")).toBe(1);
  // Household lives on: earliest-joined remaining member is admin and creator.
  const members = await client.execute("SELECT user_id, role FROM household_members WHERE household_id = 300 ORDER BY user_id");
  expect(members.rows.map((r) => [Number(r.user_id), r.role])).toEqual([[2, "admin"], [4, "member"]]);
  expect(await count(client, "households", "id = 300 AND created_by = 2 AND deleted_at IS NULL")).toBe(1);
  // Shared rows the owner added stay for the others, detached or handed over.
  expect(await count(client, "meal_plans", "id = 700 AND user_id IS NULL")).toBe(1);
  expect(await count(client, "meal_plans", "id = 702")).toBe(1);
  expect(await count(client, "meal_plans", "id = 701")).toBe(0);
  expect(await count(client, "inventory", "household_id = 300 AND user_id IS NULL")).toBe(1);
  expect(await count(client, "shopping_list_items", "household_id = 300")).toBe(2);
  expect(await count(client, "shopping_list_items", "ticked_by = 1 OR moved_by = 1 OR user_id = 1")).toBe(0);
  expect(await count(client, "meal_groups", "id = 800 AND user_id = 2")).toBe(1);
  expect(await count(client, "meal_groups", "id = 801")).toBe(0);
}

describe("POST /api/account/delete", () => {
  it("rejects a wrong password with 403 and deletes nothing", async () => {
    const before = await snapshot();
    const res = await post({ password: "wrong-password" });
    expect(res.status).toBe(403);
    const after = await snapshot();
    // Only the attempt counter row may appear.
    expect({ ...after, auth_rate_limits: before.auth_rate_limits }).toEqual(before);
    expect(blob.del).not.toHaveBeenCalled();
  });

  it("does not accept the email in place of a password for a password account", async () => {
    const res = await post({ email: OWNER.email });
    expect(res.status).toBe(403);
    expect(await count(client, "users", "id = 1")).toBe(1);
  });

  it("rejects a Google-only account with the wrong email", async () => {
    session.user = { id: GOOGLE.id, name: GOOGLE.name, email: GOOGLE.email };
    const res = await post({ email: "someone-else@example.test" });
    expect(res.status).toBe(403);
    expect(await count(client, "users", "id = 3")).toBe(1);
  });

  it("deletes a Google-only account confirmed with its email", async () => {
    session.user = { id: GOOGLE.id, name: GOOGLE.name, email: GOOGLE.email };
    const res = await post({ email: ` ${GOOGLE.email.toUpperCase()} ` });
    expect(res.status).toBe(200);
    expect(await count(client, "users", "id = 3")).toBe(0);
    expect(await count(client, "users", "id = 1")).toBe(1);
  });

  it("returns 401 when not signed in", async () => {
    session.user = null;
    const res = await post({ password: OWNER.password });
    expect(res.status).toBe(401);
  });

  it("deletes the account and its data, keeps other people's, and clears the cookie", async () => {
    const res = await post({ password: OWNER.password });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    const cookies = res.headers.getSetCookie();
    expect(cookies.length).toBeGreaterThan(0);
    expect(cookies.every((c) => c.startsWith("mychelin_token=;") && /Max-Age=0/.test(c))).toBe(true);
    await expectOwnerFullyDeleted();
    // Only the owner's files; the other user's files are untouched.
    const urls = blob.del.mock.calls.flatMap(([a]) => (Array.isArray(a) ? a : [a])).sort();
    expect(urls).toEqual(
      [`${BLOB}/cover-10.jpg`, `${BLOB}/generated-10.png`, `${BLOB}/upload-10.jpg`, `${BLOB}/voice-10.webm`].sort()
    );
  });

  it("purges a household when the owner is its only member", async () => {
    await client.execute("DELETE FROM household_members WHERE user_id IN (2, 4)");
    const res = await post({ password: OWNER.password });
    expect(res.status).toBe(200);
    expect(await count(client, "households", "id = 300")).toBe(0);
    expect(await count(client, "meal_plans", "household_id = 300")).toBe(0);
    expect(await count(client, "users", "id = 1")).toBe(0);
  });

  it("still deletes the account when the blob store fails", async () => {
    blob.del.mockRejectedValue(new Error("blob store down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ password: OWNER.password });
    expect(res.status).toBe(200);
    expect(await count(client, "users", "id = 1")).toBe(0);
  });

  it("finishes the job when retried after a partial failure", async () => {
    const schemaMod = await import("@/db/schema");
    const realDelete = db.delete.bind(db);
    let failed = false;
    vi.spyOn(db, "delete").mockImplementation(((table: unknown) => {
      if (table === schemaMod.recipes && !failed) {
        failed = true;
        throw new Error("simulated outage");
      }
      return realDelete(table as typeof schemaMod.recipes);
    }) as typeof db.delete);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const first = await post({ password: OWNER.password });
    expect(first.status).toBe(500);
    // Part-way: still signed in, so the user can retry.
    expect(await count(client, "users", "id = 1")).toBe(1);
    expect(await count(client, "books", "id = 100")).toBe(0);

    const second = await post({ password: OWNER.password });
    expect(second.status).toBe(200);
    await expectOwnerFullyDeleted();
  });

  it("rate-limits repeated attempts", async () => {
    for (let i = 0; i < 5; i++) expect((await post({ password: "nope" })).status).toBe(403);
    const res = await post({ password: OWNER.password });
    expect(res.status).toBe(429);
    expect(await count(client, "users", "id = 1")).toBe(1);
  });
});

