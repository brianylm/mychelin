import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import { NextRequest } from "next/server";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const client = createClient({ url: "file::memory:" });

  return { db: drizzle(client, { schema }), __client: client };
});

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitHeaders: vi.fn(() => ({})),
  RATE_LIMITS: { signup: {} },
}));
vi.mock("@/db/ensure-schema", () => ({ ensureUserOAuthColumns: vi.fn(async () => {}) }));
vi.mock("@/lib/usage-events", () => ({
  requestPath: vi.fn(() => "/api/auth/signup"),
  trackUsageEvent: vi.fn(async () => {}),
}));
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(async () => "hashed"),
  setAuthCookie: vi.fn(async () => {}),
}));

import { POST as signup } from "./route";

let client: Client;

beforeAll(async () => {
  const dbModule = (await import("@/db")) as unknown as { __client: Client };
  client = dbModule.__client;
  await client.executeMultiple(`
    CREATE TABLE users (
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
  `);
});

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function userCount(email: string) {
  const result = await client.execute({ sql: "SELECT COUNT(*) AS n FROM users WHERE email = ?", args: [email] });
  return Number(result.rows[0].n);
}

describe("POST /api/auth/signup age gate", () => {
  const base = { name: "Synthetic", password: "secret-123" };

  it("refuses signup without the age confirmation", async () => {
    const email = "no-age@example.com";
    const missing = await signup(request({ ...base, email }));
    expect(missing.status).toBe(400);
    expect((await missing.json()).error).toMatch(/13 or older/);

    const notTrue = await signup(request({ ...base, email, ageConfirmed: "yes" }));
    expect(notTrue.status).toBe(400);
    expect(await userCount(email)).toBe(0);
  });

  it("creates the account when age is confirmed", async () => {
    const email = "with-age@example.com";
    const response = await signup(request({ ...base, email, ageConfirmed: true }));
    expect(response.status).toBe(201);
    expect(await userCount(email)).toBe(1);
  });
});
