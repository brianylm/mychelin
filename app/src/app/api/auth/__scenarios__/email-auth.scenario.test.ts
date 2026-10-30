/**
 * Email auth state machine (login / signup / forgot), driven through the real
 * route handlers with an in-memory libsql DB.
 *
 * States
 *   ANON(mode)            visitor on /login in mode login | signup | forgot
 *   SUBMITTED(body)       POST to the mode's route
 *   RATE_LIMITED          limiter said no
 *   terminal:  CREATED 201 | SIGNED_IN 200 | GENERIC_OK 200 (forgot)
 *              BAD_REQUEST 400 | UNAUTHORIZED 401 | DUPLICATE 409
 *              TOO_MANY 429 | SERVER_ERROR 500
 *
 * Transition table (signup = POST /api/auth/signup)
 * | from         | event / guard                                         | to            | user row created |
 * |--------------|-------------------------------------------------------|---------------|------------------|
 * | ANON(signup) | limiter denies                                        | TOO_MANY 429  | no               |
 * | ANON(signup) | body not JSON / JSON null                             | SERVER_ERROR  | no               |
 * | ANON(signup) | name|email|password missing                           | BAD_REQUEST   | no               |
 * | ANON(signup) | ageConfirmed !== true (absent,false,"yes",1,"true",   | BAD_REQUEST   | no               |
 * |              |   null,[true],{},duplicate-key-last-false)            |               |                  |
 * | ANON(signup) | age ok, password < 6                                  | BAD_REQUEST   | no               |
 * | ANON(signup) | age ok, email exists (any account state)              | DUPLICATE 409 | no               |
 * | ANON(signup) | age ok, email exists, but age missing                 | BAD_REQUEST   | no (age first)   |
 * | ANON(signup) | age ok, new email (anon / invitee / share / admin)    | CREATED 201   | yes              |
 * | ANON(signup) | age ok, same new email submitted twice concurrently   | 201 + 409     | exactly one      |
 * | ANON(login)  | limiter denies                                        | TOO_MANY 429  | no               |
 * | ANON(login)  | no account                                            | UNAUTHORIZED  | no               |
 * | ANON(login)  | password account, right password                      | SIGNED_IN     | no               |
 * | ANON(login)  | Google-only account (random hash)                     | UNAUTHORIZED  | no               |
 * | ANON(forgot) | any account state                                     | GENERIC_OK    | no               |
 *
 * returnTo is applied client-side by AuthScreen after a 2xx, so the role
 * contexts (household invitee /join/X, shared-recipe /shared/X, admin email)
 * only change which email is used; the server outcome must be identical.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import { NextRequest } from "next/server";
import { countUsers, resetUsers, seedAccount, type AccountState } from "./_harness";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const client = createClient({ url: "file::memory:" });
  return { db: drizzle(client, { schema }), __client: client };
});

const limiter = vi.hoisted(() => ({ allowed: true }));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: limiter.allowed, retryAfterSeconds: 120 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitHeaders: vi.fn(() => ({})),
  RATE_LIMITS: { signup: {}, login: {}, forgotPassword: {} },
}));
vi.mock("@/db/ensure-schema", () => ({ ensureUserOAuthColumns: vi.fn(async () => {}) }));
vi.mock("@/lib/usage-events", () => ({
  requestPath: vi.fn(() => "/api/auth/signup"),
  trackUsageEvent: vi.fn(async () => {}),
}));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: vi.fn(async () => {}) }));
vi.mock("@/lib/auth", async () => {
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  return {
    hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
    verifyPassword: vi.fn(async (p: string, h: string) => h === `hashed:${p}`),
    setAuthCookie: vi.fn(async () => {}),
    getUserFromDb: vi.fn(async (email: string) =>
      db.query.users.findFirst({ where: eq(users.email, email) })
    ),
  };
});

import { POST as signup } from "../signup/route";
import { POST as login } from "../login/route";
import { POST as forgot } from "../forgot-password/route";

let client: Client;

beforeAll(async () => {
  client = ((await import("@/db")) as unknown as { __client: Client }).__client;
});
beforeEach(async () => {
  limiter.allowed = true;
  await resetUsers(client);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function post(path: string, body: unknown, raw = false) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

const EMAIL = "cook@example.test";
const SUB = "google-sub-1";
const valid = { name: "Synthetic Cook", email: EMAIL, password: "secret-123", ageConfirmed: true };

// ── signup: age-confirmation dimension ────────────────────────────────────
describe("signup × ageConfirmed (account: none)", () => {
  const rejected: Array<[string, unknown]> = [
    ["absent", undefined],
    ["false", false],
    ['"yes"', "yes"],
    ["1", 1],
    ['"true"', "true"],
    ['"1"', "1"],
    ["null", null],
    ["[true]", [true]],
    ["{}", {}],
  ];
  it.each(rejected)("ageConfirmed=%s → 400, no row", async (_label, age) => {
    const body: Record<string, unknown> = { ...valid };
    if (age === undefined) delete body.ageConfirmed;
    else body.ageConfirmed = age;
    const res = await signup(post("/api/auth/signup", body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/13 or older/);
    expect(await countUsers(client)).toBe(0);
  });

  it("duplicate JSON key, last value false → 400 (JSON.parse last-wins)", async () => {
    const raw = `{"name":"x","email":"${EMAIL}","password":"secret-123","ageConfirmed":true,"ageConfirmed":false}`;
    const res = await signup(post("/api/auth/signup", raw, true));
    expect(res.status).toBe(400);
    expect(await countUsers(client)).toBe(0);
  });

  it("ageConfirmed=true → 201, one row", async () => {
    const res = await signup(post("/api/auth/signup", valid));
    expect(res.status).toBe(201);
    expect(await countUsers(client)).toBe(1);
  });
});

// ── signup: account-state dimension ──────────────────────────────────────
describe("signup × account state", () => {
  const states: AccountState[] = ["none", "password_by_email", "google_by_sub", "password_unverified"];
  it.each(states)("account=%s, age ok", async (state) => {
    await seedAccount(client, state, EMAIL, SUB);
    const before = await countUsers(client);
    const res = await signup(post("/api/auth/signup", valid));
    // google_by_sub has a different stored email, so this email is free.
    const expected = state === "none" || state === "google_by_sub" ? 201 : 409;
    expect(res.status).toBe(expected);
    expect(await countUsers(client)).toBe(before + (expected === 201 ? 1 : 0));
  });

  it.each(states)("account=%s, age missing → 400 before the duplicate check", async (state) => {
    await seedAccount(client, state, EMAIL, SUB);
    const { ageConfirmed: _drop, ...noAge } = valid;
    const res = await signup(post("/api/auth/signup", noAge));
    expect(res.status).toBe(400);
  });

  it("email case/whitespace variant of an existing account → 409", async () => {
    await seedAccount(client, "password_by_email", EMAIL, SUB);
    const res = await signup(post("/api/auth/signup", { ...valid, email: "  COOK@Example.TEST " }));
    expect(res.status).toBe(409);
  });
});

// ── signup: validation / infra outcomes ──────────────────────────────────
describe("signup × validation and infrastructure", () => {
  it("rate limited → 429 even with valid body", async () => {
    limiter.allowed = false;
    const res = await signup(post("/api/auth/signup", valid));
    expect(res.status).toBe(429);
    expect(await countUsers(client)).toBe(0);
  });
  it.each([
    ["name", { ...valid, name: "" }],
    ["email", { ...valid, email: "   " }],
    ["password", { ...valid, password: "" }],
  ])("missing %s → 400", async (_f, body) => {
    expect((await signup(post("/api/auth/signup", body))).status).toBe(400);
  });
  it("short password with age ok → 400", async () => {
    expect((await signup(post("/api/auth/signup", { ...valid, password: "12345" }))).status).toBe(400);
  });
  it("non-JSON body → 500 (generic failure, no row)", async () => {
    const res = await signup(post("/api/auth/signup", "not json", true));
    expect(res.status).toBe(500);
    expect(await countUsers(client)).toBe(0);
  });
  it("JSON null body → 500 (destructuring null), no row", async () => {
    const res = await signup(post("/api/auth/signup", "null", true));
    expect(res.status).toBe(500);
  });
  it("DB failure after validation → 500", async () => {
    await client.execute("DROP TABLE users");
    const res = await signup(post("/api/auth/signup", valid));
    expect(res.status).toBe(500);
  });
});

// ── signup: race / double-submit ─────────────────────────────────────────
describe("signup × double submit", () => {
  // EXPECTED TO FAIL (finding): both requests pass the findFirst duplicate
  // check before either insert; the loser hits the UNIQUE constraint and is
  // reported as 500 "Failed to create account" instead of 409.
  it("two concurrent identical signups → one 201 and one 409, one row", async () => {
    const [a, b] = await Promise.all([
      signup(post("/api/auth/signup", valid)),
      signup(post("/api/auth/signup", valid)),
    ]);
    expect(await countUsers(client)).toBe(1);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });
});

// ── signup: entry contexts / roles ───────────────────────────────────────
describe("signup × entry context (server is context-blind)", () => {
  const contexts = [
    ["anonymous visitor", "anon@example.test"],
    ["household invitee via /join/ABC123", "invitee@example.test"],
    ["shared-recipe visitor via /shared/tok", "sharer@example.test"],
  ] as const;
  it.each(contexts)("%s: no age → 400; age → 201", async (_ctx, email) => {
    const { ageConfirmed: _d, ...noAge } = { ...valid, email };
    expect((await signup(post("/api/auth/signup", noAge))).status).toBe(400);
    expect((await signup(post("/api/auth/signup", { ...valid, email }))).status).toBe(201);
  });

  it("admin email that already has an account → 409", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@example.test");
    await seedAccount(client, "password_by_email", "boss@example.test", SUB);
    expect((await signup(post("/api/auth/signup", { ...valid, email: "boss@example.test" }))).status).toBe(409);
  });
});

// ── login mode ───────────────────────────────────────────────────────────
describe("login × account state", () => {
  it.each([
    ["none", 401],
    ["password_by_email", 200],
    ["password_unverified", 200],
  ] as Array<[AccountState, number]>)("account=%s → %i, never creates a row", async (state, status) => {
    await seedAccount(client, state, EMAIL, SUB);
    const before = await countUsers(client);
    const res = await login(post("/api/auth/login", { email: EMAIL, password: "secret-123", ageConfirmed: true }));
    expect(res.status).toBe(status);
    expect(await countUsers(client)).toBe(before);
  });
  it("Google-only account with any password → 401", async () => {
    await seedAccount(client, "google_by_sub", EMAIL, SUB);
    expect((await login(post("/api/auth/login", { email: "old-" + EMAIL, password: "secret-123" }))).status).toBe(401);
  });
  it("rate limited → 429", async () => {
    limiter.allowed = false;
    expect((await login(post("/api/auth/login", { email: EMAIL, password: "x" }))).status).toBe(429);
  });
  it("missing fields → 400", async () => {
    expect((await login(post("/api/auth/login", { email: EMAIL }))).status).toBe(400);
  });
});

// ── forgot mode ──────────────────────────────────────────────────────────
describe("forgot × account state", () => {
  it.each(["none", "password_by_email", "google_by_sub", "password_unverified"] as AccountState[])(
    "account=%s → generic 200, never creates a user",
    async (state) => {
      await seedAccount(client, state, EMAIL, SUB);
      const before = await countUsers(client);
      const res = await forgot(post("/api/auth/forgot-password", { email: EMAIL }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(await countUsers(client)).toBe(before);
    }
  );
  it("rate limited → 429", async () => {
    limiter.allowed = false;
    expect((await forgot(post("/api/auth/forgot-password", { email: EMAIL }))).status).toBe(429);
  });
});
