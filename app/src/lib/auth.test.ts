/**
 * Session revocation: the auth JWT carries the user's token_version ("tv") and
 * getCurrentUser rejects it once users.token_version has moved on. Real jose
 * and the real auth module; in-memory libsql DB and a fake cookie store.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import { SignJWT } from "jose";
import { resetUsers } from "@/app/api/auth/__scenarios__/_harness";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const client = createClient({ url: "file::memory:" });
  return { db: drizzle(client, { schema }), __client: client };
});
vi.mock("@/db/ensure-schema", () => ({
  ensureUserOAuthColumns: vi.fn(async () => {}),
  ensureUserTokenVersionColumn: vi.fn(async () => {}),
}));
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
  })),
}));

import { COOKIE_NAME, bumpTokenVersion, createToken, getCurrentUser, setAuthCookie } from "./auth";

const SECRET = "test-secret-for-auth-unit-tests";
let client: Client;

beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", SECRET);
  client = ((await import("@/db")) as unknown as { __client: Client }).__client;
});
afterAll(() => {
  vi.unstubAllEnvs();
});
beforeEach(async () => {
  jar.clear();
  await resetUsers(client);
  await client.execute({
    sql: "INSERT INTO users (id, name, email, password_hash, created_at, token_version) VALUES (1, 'DB Name', 'db@example.test', 'h', ?, ?)",
    args: [new Date().toISOString(), 0],
  });
});

async function rawToken(payload: Record<string, unknown>, alg = "HS256") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(SECRET));
}

describe("getCurrentUser × token_version", () => {
  it("matching tv → user, with name/email from the DB row, not the token", async () => {
    jar.set(COOKIE_NAME, await rawToken({ id: 1, name: "Forged", email: "forged@example.test", tv: 0 }));
    expect(await getCurrentUser()).toEqual({ id: 1, name: "DB Name", email: "db@example.test" });
  });

  it("tv mismatch → null", async () => {
    await client.execute("UPDATE users SET token_version = 3 WHERE id = 1");
    jar.set(COOKIE_NAME, await rawToken({ id: 1, name: "DB Name", email: "db@example.test", tv: 2 }));
    expect(await getCurrentUser()).toBeNull();
  });

  it("missing tv claim (pre-deploy cookie) is treated as 0", async () => {
    jar.set(COOKIE_NAME, await rawToken({ id: 1, name: "DB Name", email: "db@example.test" }));
    expect(await getCurrentUser()).toEqual({ id: 1, name: "DB Name", email: "db@example.test" });
    await client.execute("UPDATE users SET token_version = 1 WHERE id = 1");
    expect(await getCurrentUser()).toBeNull();
  });

  it("deleted user → null", async () => {
    jar.set(COOKIE_NAME, await rawToken({ id: 1, tv: 0 }));
    await client.execute("DELETE FROM users");
    expect(await getCurrentUser()).toBeNull();
  });

  it.each([
    ["non-number tv", { id: 1, tv: "0" }],
    ["fractional tv", { id: 1, tv: 0.5 }],
    ["string id", { id: "1", tv: 0 }],
    ["missing id", { tv: 0 }],
  ])("malformed claims (%s) → null", async (_label, payload) => {
    jar.set(COOKIE_NAME, await rawToken(payload));
    expect(await getCurrentUser()).toBeNull();
  });

  it("only HS256 is accepted", async () => {
    jar.set(COOKIE_NAME, await rawToken({ id: 1, tv: 0 }, "HS512"));
    expect(await getCurrentUser()).toBeNull();
  });

  it("DB failure fails closed → null", async () => {
    jar.set(COOKIE_NAME, await rawToken({ id: 1, tv: 0 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await client.execute("DROP TABLE users");
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("createToken / setAuthCookie / bumpTokenVersion", () => {
  it("issued cookie carries tv and survives until the next bump", async () => {
    await setAuthCookie({ id: 1, name: "DB Name", email: "db@example.test", tokenVersion: 0 });
    expect(await getCurrentUser()).not.toBeNull();

    expect(await bumpTokenVersion(1)).toBe(1);
    expect(await getCurrentUser()).toBeNull();

    jar.set(COOKIE_NAME, await createToken({ id: 1, name: "DB Name", email: "db@example.test", tokenVersion: 1 }));
    expect(await getCurrentUser()).toEqual({ id: 1, name: "DB Name", email: "db@example.test" });
  });

  it("bumpTokenVersion on a missing user throws", async () => {
    await expect(bumpTokenVersion(999)).rejects.toThrow();
  });
});
