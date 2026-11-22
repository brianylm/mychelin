import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const client = createClient({ url: "file::memory:" });
  return { db: drizzle(client, { schema }), __client: client };
});

const currentUser = vi.hoisted(() => ({ id: 1, name: "Ann", email: "ann@example.com" }));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({ ...currentUser })),
}));
vi.mock("@/db/ensure-schema", () => ({
  ensureHouseholdTables: vi.fn(async () => undefined),
  ensureMealPilotTables: vi.fn(async () => undefined),
}));
vi.mock("@/lib/meal-calendar/store", () => ({
  queueCalendarMemberDeparture: vi.fn(async () => undefined),
  queueCalendarHouseholdDeletion: vi.fn(async () => undefined),
}));
vi.mock("@/lib/rateLimit", async (orig) => ({
  ...(await orig<typeof import("@/lib/rateLimit")>()),
  checkRateLimit: vi.fn(),
}));

import { DELETE as deleteHousehold } from "./route";
import { POST as join } from "./join/route";
import { POST as leave } from "./leave/route";
import { DELETE as removeMember } from "./members/route";
import { checkRateLimit } from "@/lib/rateLimit";
import { generateJoinCode, isWellFormedJoinCode } from "@/lib/households";

const check = vi.mocked(checkRateLimit);
let client: Client;

function as(userId: number) {
  currentUser.id = userId;
}

function joinWith(code: string) {
  return join(
    new Request("http://localhost/api/households/join", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify({ joinCode: code }),
    }) as never
  );
}

async function codeOf(householdId: number): Promise<string> {
  const { rows } = await client.execute({
    sql: "SELECT join_code FROM households WHERE id = ?",
    args: [householdId],
  });
  return String(rows[0].join_code);
}

async function memberRows(householdId: number) {
  const { rows } = await client.execute({
    sql: "SELECT user_id, role FROM household_members WHERE household_id = ? ORDER BY user_id",
    args: [householdId],
  });
  return rows.map((r) => ({ userId: Number(r.user_id), role: String(r.role) }));
}

const NOW = new Date().toISOString();

// Household 1: Ann (admin, user 1) + Ben (member, user 2), code ABCDEFGH.
async function seed(code = "ABCDEFGH") {
  await client.executeMultiple(`
    DELETE FROM household_activity_log;
    DELETE FROM household_member_blocks;
    DELETE FROM household_members;
    DELETE FROM households;
  `);
  await client.execute({
    sql: "INSERT INTO households (id, name, join_code, created_by, deleted_at, created_at) VALUES (1, 'Flat', ?, 1, NULL, ?)",
    args: [code, NOW],
  });
  await client.execute({
    sql: "INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES (1, 1, 'admin', ?), (1, 2, 'member', ?)",
    args: [NOW, NOW],
  });
}

beforeAll(async () => {
  const dbModule = (await import("@/db")) as unknown as { __client: Client };
  client = dbModule.__client;
  await client.executeMultiple(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL);
    INSERT INTO users (id, name, email) VALUES
      (1, 'Ann', 'ann@example.com'), (2, 'Ben', 'ben@example.com'), (3, 'Cat', 'cat@example.com');
    CREATE TABLE recipes (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT NOT NULL, yield TEXT);
    CREATE TABLE meal_plans (
      id INTEGER PRIMARY KEY, user_id INTEGER, household_id INTEGER, recipe_id INTEGER NOT NULL,
      ghost_title TEXT, ghost_yield TEXT, ghosted_at TEXT
    );
    CREATE TABLE households (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, join_code TEXT NOT NULL UNIQUE,
      created_by INTEGER NOT NULL, deleted_at TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE household_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, household_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
      role TEXT NOT NULL, joined_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX household_members_unique_idx ON household_members(household_id, user_id);
    CREATE TABLE household_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, household_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
      action TEXT NOT NULL, target_name TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE household_member_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, household_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
      scope TEXT NOT NULL, date TEXT NOT NULL, meal_type TEXT NOT NULL DEFAULT '', note TEXT,
      created_at TEXT NOT NULL
    );
  `);
});

afterAll(() => client.close());

beforeEach(async () => {
  check.mockReset();
  check.mockResolvedValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 });
  await seed();
});

describe("join code generation", () => {
  it("new codes are 8 characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it("accepts 8-char and legacy 6-char codes, rejects other shapes", () => {
    expect(isWellFormedJoinCode("ABCDEFGH")).toBe(true);
    expect(isWellFormedJoinCode("ABC234")).toBe(true);
    expect(isWellFormedJoinCode("ABCDEFG")).toBe(false);
    expect(isWellFormedJoinCode("ABCDEF0O")).toBe(false);
    expect(isWellFormedJoinCode("ABCDEFGHJ")).toBe(false);
  });
});

describe("join code rotation", () => {
  it("removing a member rotates the code and the removed member cannot rejoin", async () => {
    as(1);
    const res = await removeMember(
      new Request("http://localhost/api/households/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 2 }),
      }) as never
    );
    expect(res.status).toBe(200);
    const code = await codeOf(1);
    expect(code).not.toBe("ABCDEFGH");
    expect(code).toHaveLength(8);

    as(2);
    const rejoin = await joinWith("ABCDEFGH");
    expect(rejoin.status).toBe(404);
  });

  it("a member leaving rotates the code", async () => {
    as(2);
    const res = await leave();
    expect(res.status).toBe(200);
    expect((await res.json()).householdDeleted).toBe(false);
    const code = await codeOf(1);
    expect(code).not.toBe("ABCDEFGH");
    expect(code).toHaveLength(8);
    expect(await memberRows(1)).toEqual([{ userId: 1, role: "admin" }]);
  });

  it("admin delete keeps the code (only a former admin can use it) and keeps member rows", async () => {
    as(1);
    const res = await deleteHousehold();
    expect(res.status).toBe(200);
    expect(await codeOf(1)).toBe("ABCDEFGH");
    expect(await memberRows(1)).toHaveLength(2);
  });
});

describe("join rate limit", () => {
  it("checks per-user and per-IP buckets on every attempt", async () => {
    as(3);
    await joinWith("ZZZZZZZZ");
    expect(check).toHaveBeenCalledWith(
      expect.objectContaining({ name: "household_join_user", limit: 10 }),
      "user:3"
    );
    expect(check).toHaveBeenCalledWith(
      expect.objectContaining({ name: "household_join_ip", limit: 30 }),
      "ip:203.0.113.9"
    );
  });

  it("returns 429 after the limit is hit, without looking the code up", async () => {
    as(3);
    let calls = 0;
    check.mockImplementation(async (config) => {
      if (config.name === "household_join_user") calls++;
      return calls > 10
        ? { allowed: false, remaining: 0, retryAfterSeconds: 600 }
        : { allowed: true, remaining: 10 - calls, retryAfterSeconds: 0 };
    });
    for (let i = 0; i < 10; i++) {
      expect((await joinWith("ZZZZZZZZ")).status).toBe(404);
    }
    // Even the right code is refused once the bucket is empty.
    const blocked = await joinWith("ABCDEFGH");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("600");
    expect((await blocked.json()).error).toMatch(/too many join attempts/i);
    expect(await memberRows(1)).toHaveLength(2);
  });

  it("an exhausted IP bucket also blocks", async () => {
    as(3);
    check.mockImplementation(async (config) =>
      config.name === "household_join_ip"
        ? { allowed: false, remaining: 0, retryAfterSeconds: 60 }
        : { allowed: true, remaining: 9, retryAfterSeconds: 0 }
    );
    expect((await joinWith("ABCDEFGH")).status).toBe(429);
  });
});

describe("joining live households", () => {
  it("a legacy 6-char code still joins (case-insensitive)", async () => {
    await seed("ABC234");
    as(3);
    const res = await joinWith("abc234");
    expect(res.status).toBe(200);
    expect((await res.json()).household.myRole).toBe("member");
  });

  it("an 8-char code joins", async () => {
    as(3);
    const res = await joinWith("ABCDEFGH");
    expect(res.status).toBe(200);
  });
});

describe("reactivating a soft-deleted household", () => {
  async function softDelete() {
    await client.execute({
      sql: "UPDATE households SET deleted_at = ? WHERE id = 1",
      args: [new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()],
    });
  }

  it("an outsider with the code gets the invalid-code response", async () => {
    await softDelete();
    as(3);
    const res = await joinWith("ABCDEFGH");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No household found for that code" });
    const { rows } = await client.execute("SELECT deleted_at FROM households WHERE id = 1");
    expect(rows[0].deleted_at).not.toBeNull();
    expect(await memberRows(1)).toHaveLength(2);
  });

  it("a former non-admin member gets the invalid-code response", async () => {
    await softDelete();
    as(2);
    const res = await joinWith("ABCDEFGH");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No household found for that code" });
  });

  it("the former admin reactivates the household", async () => {
    await softDelete();
    as(1);
    const res = await joinWith("ABCDEFGH");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reactivated).toBe(true);
    expect(body.household.myRole).toBe("admin");
    const { rows } = await client.execute("SELECT deleted_at FROM households WHERE id = 1");
    expect(rows[0].deleted_at).toBeNull();
  });

  it("an admin who is the last to leave can reactivate", async () => {
    as(2);
    await leave();
    const rotated = await codeOf(1);
    as(1);
    const leaveRes = await leave();
    expect((await leaveRes.json()).householdDeleted).toBe(true);
    // The last-out row is kept (role intact) and the code is not rotated.
    expect(await memberRows(1)).toEqual([{ userId: 1, role: "admin" }]);
    expect(await codeOf(1)).toBe(rotated);

    as(3);
    expect((await joinWith(rotated)).status).toBe(404);

    as(1);
    const res = await joinWith(rotated);
    expect(res.status).toBe(200);
    expect((await res.json()).reactivated).toBe(true);
  });
});
