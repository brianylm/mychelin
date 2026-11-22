/**
 * Email verification through the real routes with an in-memory libsql DB.
 *
 * | event                                   | outcome                                   |
 * |-----------------------------------------|-------------------------------------------|
 * | POST /signup (ok)                       | 201, token row for the address, mail sent |
 * | POST /signup, mail send throws          | 201 still, verificationSent false         |
 * | POST /verify-email/send, signed out     | 401                                       |
 * | POST /verify-email/send, verified       | 200 alreadyVerified, nothing sent         |
 * | POST /verify-email/send, limiter denies | 429, nothing sent                         |
 * | POST /verify-email/send, unverified     | 200 sent, older link superseded           |
 * | POST /verify-email {token}              | 200 verified / 400 reason                 |
 * | POST /reset-password (ok)               | email_verified = 1 (link went to address) |
 * | GET /me                                 | user.emailVerified from the DB            |
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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
  ensureEmailVerificationTokensTable: vi.fn(async () => {}),
}));
const limiter = vi.hoisted(() => ({ deny: new Set<string>(), calls: [] as string[] }));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(async (config: { name: string }, key: string) => {
    limiter.calls.push(`${config.name}:${key}`);
    return { allowed: !limiter.deny.has(config.name), retryAfterSeconds: 120 };
  }),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitHeaders: vi.fn(() => ({})),
  RATE_LIMITS: {
    signup: { name: "signup" },
    resetPassword: { name: "reset_password" },
    verifyEmail: { name: "verify_email" },
    verifyEmailSendUser: { name: "verify_email_send_user" },
    verifyEmailSendIp: { name: "verify_email_send_ip" },
  },
}));
vi.mock("@/lib/usage-events", () => ({
  requestPath: vi.fn(() => "/api/auth/signup"),
  trackUsageEvent: vi.fn(async () => {}),
}));
const mail = vi.hoisted(() => ({ urls: [] as string[], fail: false }));
const emailDelivery = vi.hoisted(() => ({ ready: true }));
vi.mock("@/lib/email", () => ({
  canEmailAnyAddress: () => emailDelivery.ready,
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendVerificationEmail: vi.fn(async (_to: string, _name: string, url: string) => {
    if (mail.fail) throw new Error("resend down");
    mail.urls.push(url);
    return true;
  }),
}));
const session = vi.hoisted(() => ({ user: null as null | { id: number; name: string; email: string } }));
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
  setAuthCookie: vi.fn(async () => {}),
  getCurrentUser: vi.fn(async () => session.user),
}));

import { POST as signup } from "../signup/route";
import { POST as sendVerification } from "../verify-email/send/route";
import { POST as verifyEmail } from "../verify-email/route";
import { POST as resetPassword } from "../reset-password/route";
import { GET as me } from "../me/route";
import { hashToken } from "@/lib/tokens";

let client: Client;
const EMAIL = "cook@example.test";
const USER = { id: 1, name: "Synthetic Cook", email: EMAIL };

beforeAll(async () => {
  client = ((await import("@/db")) as unknown as { __client: Client }).__client;
});
beforeEach(async () => {
  limiter.deny = new Set();
  limiter.calls = [];
  mail.urls = [];
  mail.fail = false;
  session.user = null;
  await resetUsers(client);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

function post(path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function seedUser(verified: boolean) {
  await client.execute({
    sql: "INSERT INTO users (id, name, email, password_hash, email_verified, created_at) VALUES (1, ?, ?, 'hashed:old', ?, ?)",
    args: [USER.name, EMAIL, verified ? 1 : 0, new Date().toISOString()],
  });
}

async function tokenRows() {
  return (await client.execute("SELECT * FROM email_verification_tokens ORDER BY id")).rows;
}

async function verifiedFlag() {
  return Number((await client.execute("SELECT email_verified FROM users WHERE email = 'cook@example.test'")).rows[0].email_verified);
}

const signupBody = { name: "Synthetic Cook", email: EMAIL, password: "secret-123", ageConfirmed: true };

describe("signup sends a verification link", () => {
  it("creates a token for the address and reports verificationSent", async () => {
    const res = await signup(post("/api/auth/signup", signupBody));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.verificationSent).toBe(true);
    expect(data.user).toMatchObject({ email: EMAIL, emailVerified: false });
    const rows = await tokenRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe(EMAIL);
    expect(mail.urls[0]).toMatch(/\/verify-email\?token=/);
    expect(await verifiedFlag()).toBe(0);
  });

  it("still succeeds when sending throws", async () => {
    mail.fail = true;
    const res = await signup(post("/api/auth/signup", signupBody));
    expect(res.status).toBe(201);
    expect((await res.json()).verificationSent).toBe(false);
    expect(Number((await client.execute("SELECT COUNT(*) AS n FROM users")).rows[0].n)).toBe(1);
  });

  it("still succeeds when the token table is missing", async () => {
    await client.execute("DROP TABLE email_verification_tokens");
    const res = await signup(post("/api/auth/signup", signupBody));
    expect(res.status).toBe(201);
    expect((await res.json()).verificationSent).toBe(false);
  });
});

describe("POST /api/auth/verify-email/send (resend)", () => {
  it("signed out → 401", async () => {
    const res = await sendVerification(post("/api/auth/verify-email/send"));
    expect(res.status).toBe(401);
    expect(mail.urls).toHaveLength(0);
  });

  it("already verified → 200 alreadyVerified, nothing sent", async () => {
    await seedUser(true);
    session.user = USER;
    const res = await sendVerification(post("/api/auth/verify-email/send"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyVerified: true });
    expect(mail.urls).toHaveLength(0);
    expect(await tokenRows()).toHaveLength(0);
  });

  it.each(["verify_email_send_user", "verify_email_send_ip"])("limiter %s denies → 429, nothing sent", async (name) => {
    await seedUser(false);
    session.user = USER;
    limiter.deny.add(name);
    const res = await sendVerification(post("/api/auth/verify-email/send"));
    expect(res.status).toBe(429);
    expect(mail.urls).toHaveLength(0);
  });

  it("limits per user id and per IP", async () => {
    await seedUser(false);
    session.user = USER;
    await sendVerification(post("/api/auth/verify-email/send"));
    expect(limiter.calls).toEqual(
      expect.arrayContaining(["verify_email_send_user:1", "verify_email_send_ip:127.0.0.1"])
    );
  });

  it("unverified → sends a fresh link and supersedes the older one", async () => {
    await seedUser(false);
    session.user = USER;
    await sendVerification(post("/api/auth/verify-email/send"));
    const res = await sendVerification(post("/api/auth/verify-email/send"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    const rows = await tokenRows();
    expect(rows).toHaveLength(2);
    expect(rows[0].used_at).toBeTruthy();
    expect(rows[1].used_at).toBeNull();
  });

  it("send failure → 502, no crash", async () => {
    await seedUser(false);
    session.user = USER;
    mail.fail = true;
    const res = await sendVerification(post("/api/auth/verify-email/send"));
    expect(res.status).toBe(502);
  });
});

describe("POST /api/auth/verify-email", () => {
  it("valid link from signup verifies without a session", async () => {
    await signup(post("/api/auth/signup", signupBody));
    const token = new URL(mail.urls[0]).searchParams.get("token");
    session.user = null;
    const res = await verifyEmail(post("/api/auth/verify-email", { token }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true });
    expect(await verifiedFlag()).toBe(1);
  });

  it.each([[{ token: "nope" }], [{}], [{ token: 5 }]])("bad token %j → 400 invalid", async (body) => {
    await seedUser(false);
    const res = await verifyEmail(post("/api/auth/verify-email", body));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("invalid");
    expect(await verifiedFlag()).toBe(0);
  });

  it("rate limited → 429", async () => {
    limiter.deny.add("verify_email");
    const res = await verifyEmail(post("/api/auth/verify-email", { token: "x" }));
    expect(res.status).toBe(429);
  });
});

describe("reset-password proves ownership", () => {
  it("sets email_verified and still bumps token_version", async () => {
    await seedUser(false);
    await client.execute({
      sql: "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (1, ?, ?)",
      args: [await hashToken("raw-reset"), new Date(Date.now() + 3_600_000).toISOString()],
    });
    const res = await resetPassword(post("/api/auth/reset-password", { token: "raw-reset", password: "brand-new" }));
    expect(res.status).toBe(200);
    const row = (await client.execute("SELECT email_verified, token_version FROM users WHERE id = 1")).rows[0];
    expect(Number(row.email_verified)).toBe(1);
    expect(Number(row.token_version)).toBe(1);
  });
});

describe("GET /api/auth/me", () => {
  it.each([[false], [true]])("exposes emailVerified=%s", async (verified) => {
    await seedUser(verified);
    session.user = USER;
    const res = await me();
    expect(res.status).toBe(200);
    expect((await res.json()).user).toEqual({ ...USER, emailVerified: verified });
  });

  it("signed out → 401", async () => {
    expect((await me()).status).toBe(401);
  });
});
