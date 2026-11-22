import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import { resetUsers } from "@/app/api/auth/__scenarios__/_harness";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const client = createClient({ url: "file::memory:" });
  return { db: drizzle(client, { schema }), __client: client };
});
vi.mock("@/db/ensure-schema", () => ({
  ensureEmailVerificationTokensTable: vi.fn(async () => {}),
  ensureUserOAuthColumns: vi.fn(async () => {}),
}));
const sent = vi.hoisted(() => ({ urls: [] as string[] }));
const emailDelivery = vi.hoisted(() => ({ ready: true }));
vi.mock("@/lib/email", () => ({
  canEmailAnyAddress: () => emailDelivery.ready,
  sendVerificationEmail: vi.fn(async (_to: string, _name: string, url: string) => {
    sent.urls.push(url);
    return true;
  }),
}));

import { getEmailVerified, issueEmailVerification, verifyEmailToken } from "./email-verification";
import { hashToken } from "./tokens";

let client: Client;
const USER = { id: 1, name: "Synthetic Cook", email: "cook@example.test" };

beforeAll(async () => {
  client = ((await import("@/db")) as unknown as { __client: Client }).__client;
});
beforeEach(async () => {
  sent.urls = [];
  await resetUsers(client);
  await client.execute({
    sql: "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, 'x', ?)",
    args: [USER.id, USER.name, USER.email, new Date().toISOString()],
  });
});

function tokenFrom(url: string): string {
  return new URL(url).searchParams.get("token") ?? "";
}

async function verifiedFlag(): Promise<number> {
  const r = await client.execute("SELECT email_verified FROM users WHERE id = 1");
  return Number(r.rows[0].email_verified);
}

async function insertToken(raw: string, opts: { expiresAt?: string; usedAt?: string | null; email?: string } = {}) {
  await client.execute({
    sql: "INSERT INTO email_verification_tokens (user_id, token_hash, email, expires_at, used_at, created_at) VALUES (1, ?, ?, ?, ?, ?)",
    args: [
      await hashToken(raw),
      opts.email ?? USER.email,
      opts.expiresAt ?? new Date(Date.now() + 3_600_000).toISOString(),
      opts.usedAt ?? null,
      new Date().toISOString(),
    ],
  });
}

describe("issueEmailVerification", () => {
  it("stores only the hash, for the user's address, expiring in 24 h, and emails a /verify-email link", async () => {
    const ok = await issueEmailVerification(USER, "https://app.example.test");
    expect(ok).toBe(true);
    expect(sent.urls).toHaveLength(1);
    expect(sent.urls[0]).toMatch(/^https:\/\/app\.example\.test\/verify-email\?token=[A-Za-z0-9_-]{43}$/);
    const raw = tokenFrom(sent.urls[0]);
    const row = (await client.execute("SELECT * FROM email_verification_tokens")).rows[0];
    expect(row.token_hash).toBe(await hashToken(raw));
    expect(row.token_hash).not.toBe(raw);
    expect(row.email).toBe(USER.email);
    const ttl = new Date(String(row.expires_at)).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(23.9 * 3_600_000);
    expect(ttl).toBeLessThanOrEqual(24 * 3_600_000);
  });

  it("supersedes older unused links", async () => {
    await issueEmailVerification(USER, "https://app.example.test");
    await issueEmailVerification(USER, "https://app.example.test");
    const [first, second] = sent.urls.map(tokenFrom);
    expect(await verifyEmailToken(first)).toEqual({ ok: false, reason: "used" });
    expect(await verifyEmailToken(second)).toEqual({ ok: true, email: USER.email });
  });
});

describe("verifyEmailToken", () => {
  it("happy path: marks the token used and the user verified", async () => {
    await issueEmailVerification(USER, "https://app.example.test");
    const raw = tokenFrom(sent.urls[0]);
    expect(await verifiedFlag()).toBe(0);
    expect(await verifyEmailToken(raw)).toEqual({ ok: true, email: USER.email });
    expect(await verifiedFlag()).toBe(1);
    const row = (await client.execute("SELECT used_at FROM email_verification_tokens")).rows[0];
    expect(row.used_at).toBeTruthy();
  });

  it("expired token → expired, user stays unverified", async () => {
    await insertToken("old-token", { expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(await verifyEmailToken("old-token")).toEqual({ ok: false, reason: "expired" });
    expect(await verifiedFlag()).toBe(0);
  });

  it("used token → used, and a second use cannot verify", async () => {
    await insertToken("once");
    expect((await verifyEmailToken("once")).ok).toBe(true);
    await client.execute("UPDATE users SET email_verified = 0");
    expect(await verifyEmailToken("once")).toEqual({ ok: false, reason: "used" });
    expect(await verifiedFlag()).toBe(0);
  });

  it("token for an address the account no longer has → email_changed, not verified", async () => {
    await insertToken("stale", { email: "old@example.test" });
    expect(await verifyEmailToken("stale")).toEqual({ ok: false, reason: "email_changed" });
    expect(await verifiedFlag()).toBe(0);
  });

  it("email compare is case-insensitive", async () => {
    await insertToken("case", { email: "COOK@Example.test" });
    expect((await verifyEmailToken("case")).ok).toBe(true);
  });

  it.each([["unknown", "no-such-token"], ["empty", ""]])("%s token → invalid", async (_l, raw) => {
    expect(await verifyEmailToken(raw)).toEqual({ ok: false, reason: "invalid" });
    expect(await verifiedFlag()).toBe(0);
  });

  it("non-string input → invalid", async () => {
    expect(await verifyEmailToken(42 as unknown as string)).toEqual({ ok: false, reason: "invalid" });
  });

  it("deleted user → invalid (token cascades away)", async () => {
    await insertToken("orphan");
    await client.execute("PRAGMA foreign_keys = ON");
    await client.execute("DELETE FROM users WHERE id = 1");
    expect(await verifyEmailToken("orphan")).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("getEmailVerified", () => {
  it("reads the flag; undefined for a missing user", async () => {
    expect(await getEmailVerified(1)).toBe(false);
    await client.execute("UPDATE users SET email_verified = 1");
    expect(await getEmailVerified(1)).toBe(true);
    expect(await getEmailVerified(999)).toBeUndefined();
  });
});

describe("without a real sender (RESEND_FROM_EMAIL unset)", () => {
  it("does not mint a link and hides the unverified state", async () => {
    emailDelivery.ready = false;
    try {
      const { issueEmailVerification } = await import("./email-verification");
      expect(await issueEmailVerification({ id: 1, name: "A", email: "a@example.com" }, "http://x")).toBe(false);
    } finally {
      emailDelivery.ready = true;
    }
  });
});
