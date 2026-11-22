/**
 * Session revocation through the real routes and the real auth module.
 * Every bump of users.token_version must kill older cookies; the device that
 * made the change gets a fresh cookie where the flow keeps it signed in.
 *
 * | event                           | token_version | this device       | other devices |
 * |---------------------------------|---------------|-------------------|---------------|
 * | POST /logout                    | unchanged     | cookie cleared    | still valid   |
 * | POST /logout-all                | +1            | fresh cookie      | signed out    |
 * | POST /change-password (ok)      | +1            | fresh cookie      | signed out    |
 * | POST /change-password (wrong pw)| unchanged     | unchanged         | still valid   |
 * | POST /reset-password            | +1            | no cookie issued  | signed out    |
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import { NextRequest } from "next/server";
import { resetUsers } from "./_harness";

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
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (p: string) => `hashed:${p}`),
    compare: vi.fn(async (p: string, h: string) => h === `hashed:${p}`),
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitHeaders: vi.fn(() => ({})),
  RATE_LIMITS: { changePassword: {}, resetPassword: {} },
}));
vi.mock("@/lib/tokens", () => ({ hashToken: vi.fn(async (t: string) => `th:${t}`) }));
// One browser's cookie jar; tests swap it to act as another device.
const jar = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (jar.cookies.has(name) ? { name, value: jar.cookies.get(name)! } : undefined),
    set: (name: string, value: string) => {
      jar.cookies.set(name, value);
    },
  })),
}));

import { COOKIE_NAME, getCurrentUser, setAuthCookie } from "@/lib/auth";
import { POST as logout } from "../logout/route";
import { POST as logoutAll } from "../logout-all/route";
import { POST as changePassword } from "../change-password/route";
import { POST as resetPassword } from "../reset-password/route";

let client: Client;
const USER = { id: 1, name: "Synthetic Cook", email: "cook@example.test" };

beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", "test-secret-for-session-revocation");
  client = ((await import("@/db")) as unknown as { __client: Client }).__client;
});
afterAll(() => {
  vi.unstubAllEnvs();
});
beforeEach(async () => {
  jar.cookies = new Map();
  await resetUsers(client);
  await client.execute({
    sql: "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, 'hashed:old-secret', ?)",
    args: [USER.id, USER.name, USER.email, new Date().toISOString()],
  });
});

function post(path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function tokenVersion() {
  const r = await client.execute("SELECT token_version FROM users WHERE id = 1");
  return Number(r.rows[0].token_version);
}

/** Sign in on two devices; returns their cookie jars. */
async function twoDevices() {
  jar.cookies = new Map();
  await setAuthCookie({ ...USER, tokenVersion: await tokenVersion() });
  const other = jar.cookies;
  jar.cookies = new Map();
  await setAuthCookie({ ...USER, tokenVersion: await tokenVersion() });
  const self = jar.cookies;
  return { self, other };
}

async function signedIn(cookies: Map<string, string>) {
  const saved = jar.cookies;
  jar.cookies = cookies;
  try {
    return (await getCurrentUser()) !== null;
  } finally {
    jar.cookies = saved;
  }
}

describe("logout (this device only)", () => {
  it("does not bump token_version; other devices stay signed in", async () => {
    const { other } = await twoDevices();
    const res = await logout(post("/api/auth/logout"));
    expect(res.status).toBe(200);
    expect(await tokenVersion()).toBe(0);
    expect(await signedIn(other)).toBe(true);
  });
});

describe("logout-all", () => {
  it("requires auth", async () => {
    const res = await logoutAll(post("/api/auth/logout-all"));
    expect(res.status).toBe(401);
    expect(await tokenVersion()).toBe(0);
  });

  it("bumps token_version, signs out other devices, keeps this one", async () => {
    const { self, other } = await twoDevices();
    const oldSelfToken = self.get(COOKIE_NAME);
    jar.cookies = self;
    const res = await logoutAll(post("/api/auth/logout-all"));
    expect(res.status).toBe(200);
    expect(await tokenVersion()).toBe(1);
    expect(await signedIn(other)).toBe(false);
    expect(self.get(COOKIE_NAME)).not.toBe(oldSelfToken);
    expect(await signedIn(self)).toBe(true);
  });
});

describe("change-password", () => {
  it("bumps token_version, signs out other devices, re-issues this device's cookie", async () => {
    const { self, other } = await twoDevices();
    jar.cookies = self;
    const res = await changePassword(
      post("/api/auth/change-password", { currentPassword: "old-secret", newPassword: "new-secret" })
    );
    expect(res.status).toBe(200);
    expect(await tokenVersion()).toBe(1);
    const row = (await client.execute("SELECT password_hash FROM users")).rows[0];
    expect(row.password_hash).toBe("hashed:new-secret");
    expect(await signedIn(other)).toBe(false);
    expect(await signedIn(self)).toBe(true);
  });

  it("wrong current password → 401, nothing changes", async () => {
    const { self, other } = await twoDevices();
    jar.cookies = self;
    const res = await changePassword(
      post("/api/auth/change-password", { currentPassword: "nope", newPassword: "new-secret" })
    );
    expect(res.status).toBe(401);
    expect(await tokenVersion()).toBe(0);
    expect(await signedIn(other)).toBe(true);
  });
});

describe("reset-password", () => {
  it("bumps token_version so every existing session dies; issues no cookie", async () => {
    const { other } = await twoDevices();
    await client.execute({
      sql: "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (1, 'th:raw-token', ?)",
      args: [new Date(Date.now() + 3_600_000).toISOString()],
    });
    jar.cookies = new Map();
    const res = await resetPassword(post("/api/auth/reset-password", { token: "raw-token", password: "brand-new" }));
    expect(res.status).toBe(200);
    expect(await tokenVersion()).toBe(1);
    expect(await signedIn(other)).toBe(false);
    expect(jar.cookies.size).toBe(0);
  });
});
