/**
 * Google OAuth state machine, driven through the real /api/auth/google/start
 * and /api/auth/google/callback handlers. Google is never contacted: the token
 * endpoint is a stubbed global fetch and jose.jwtVerify is mocked to decode a
 * JSON "id token" we hand it.
 *
 * States
 *   PAGE(mode, ticked)      AuthScreen in login | signup, age box ticked or not
 *   BLOCKED_CLIENT          signup && !ticked: AuthScreen refuses, no request
 *   STARTED(cookie)         /start set state cookie {state, returnTo, ageConfirmed}
 *   AT_GOOGLE               browser on accounts.google.com
 *   CALLBACK(event)         /callback with (state, code | error, cookie)
 *   terminal: SIGNED_IN(dest) | CREATED(dest)
 *             ERR(google_cancelled | google_not_configured | google_state_mismatch
 *                 | google_login_failed | google_email_unverified
 *                 | google_age_required[+mode=signup]), returnTo kept on every ERR
 *             START_503 (no client id at /start: raw JSON, no redirect)
 *
 * Client guard (AuthScreen.startGoogleLogin):
 *   login            → /start?returnTo           (ageConfirmed never sent)
 *   signup, ticked   → /start?returnTo&ageConfirmed=1
 *   signup, unticked → BLOCKED_CLIENT
 *   forged URL       → /start?ageConfirmed=1 from any link (no CSRF / no form)
 *
 * Transition table (callback, after a valid state round-trip)
 * | cookie.ageConfirmed | account state                 | → terminal                       |
 * |---------------------|-------------------------------|----------------------------------|
 * | any                 | exists by google sub          | SIGNED_IN(returnTo)              |
 * | any                 | password acct, email verified | SIGNED_IN + sub linked           |
 * | any                 | password acct, Google says    | ERR google_email_unverified      |
 * |                     |   email_verified=false        |   (no sign-in, no link)          |
 * | true                | none                          | CREATED(returnTo)                |
 * | false / absent(old) | none                          | ERR google_age_required, signup  |
 * |                     |                               |   mode, returnTo kept            |
 * Other edges
 * | ?error=access_denied                     | ERR google_cancelled              |
 * | no GOOGLE_CLIENT_ID/SECRET               | ERR google_not_configured         |
 * | cookie missing / not JSON / state≠ / no code | ERR google_state_mismatch     |
 * | token exchange !ok, id token invalid, DB throws | ERR google_login_failed    |
 * | cookie ageConfirmed "true" | 1 | "1"     | treated as false                  |
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
const infra = vi.hoisted(() => ({ dbBroken: false }));
vi.mock("@/db/ensure-schema", () => ({
  ensureUserOAuthColumns: vi.fn(async () => {
    if (infra.dbBroken) throw new Error("db down");
  }),
}));
vi.mock("@/lib/usage-events", () => ({ trackUsageEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(async () => "hashed-random"),
  setAuthCookie: vi.fn(async () => {}),
}));
vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  jwtVerify: vi.fn(async (token: string) => {
    if (token === "invalid-signature") throw new Error("JWSSignatureVerificationFailed");
    return { payload: JSON.parse(token) };
  }),
}));

import { GET as start } from "../google/start/route";
import { GET as callback } from "../google/callback/route";
import { setAuthCookie } from "@/lib/auth";

const COOKIE = "mychelin_google_oauth_state";
const ORIGIN = "http://localhost:3000";
let client: Client;

type GoogleProfile = { sub: string; email: string; email_verified: boolean; name?: string };
const google = { profile: null as GoogleProfile | null, tokenStatus: 200, idToken: "" };

beforeAll(async () => {
  client = ((await import("@/db")) as unknown as { __client: Client }).__client;
});
beforeEach(async () => {
  await resetUsers(client);
  infra.dbBroken = false;
  google.profile = null;
  google.tokenStatus = 200;
  google.idToken = "";
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "");
  vi.mocked(setAuthCookie).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u !== "https://oauth2.googleapis.com/token") throw new Error(`unexpected network call: ${u}`);
      if (google.tokenStatus !== 200) {
        return new Response(JSON.stringify({ error: "invalid_grant" }), { status: google.tokenStatus });
      }
      const idToken = google.idToken || JSON.stringify(google.profile);
      return new Response(JSON.stringify({ id_token: idToken }), { status: 200 });
    })
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── machine drivers ──────────────────────────────────────────────────────
type PageMode = "login" | "signup";

/** What AuthScreen.startGoogleLogin would request (null = blocked client-side). */
function clientStartUrl(mode: PageMode, ticked: boolean, returnTo?: string): string | null {
  if (mode === "signup" && !ticked) return null;
  const url = new URL("/api/auth/google/start", ORIGIN);
  if (returnTo) url.searchParams.set("returnTo", returnTo);
  if (mode === "signup" && ticked) url.searchParams.set("ageConfirmed", "1");
  return url.toString();
}

async function doStart(url: string) {
  const res = await start(new NextRequest(url));
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookiePair = setCookie.split(";")[0]; // name=value exactly as the browser stores it
  const location = res.headers.get("location");
  const state = location ? new URL(location).searchParams.get("state") : null;
  return { res, cookiePair, state, rawCookie: res.cookies.get(COOKIE)?.value };
}

async function doCallback(opts: { state?: string | null; code?: string | null; error?: string; cookie?: string }) {
  const url = new URL("/api/auth/google/callback", ORIGIN);
  if (opts.state) url.searchParams.set("state", opts.state);
  if (opts.code) url.searchParams.set("code", opts.code);
  if (opts.error) url.searchParams.set("error", opts.error);
  const headers: Record<string, string> = { host: "localhost:3000" };
  if (opts.cookie) headers.cookie = opts.cookie;
  const res = await callback(new NextRequest(url, { headers }));
  const loc = new URL(res.headers.get("location") ?? "about:blank");
  return { res, loc, path: loc.pathname, error: loc.searchParams.get("error"), mode: loc.searchParams.get("mode") };
}

/** Full happy round-trip: page → start → Google approves → callback. */
async function roundTrip(startUrl: string, profile: GoogleProfile) {
  const s = await doStart(startUrl);
  google.profile = profile;
  return doCallback({ state: s.state, code: "auth-code", cookie: s.cookiePair });
}

function cookieHeader(value: string) {
  return `${COOKIE}=${encodeURIComponent(value)}`;
}

const EMAIL = "cook@example.test";
const SUB = "google-sub-1";
const verified = (email = EMAIL, sub = SUB): GoogleProfile => ({ sub, email, email_verified: true, name: "Cook" });

// ── /start: ageConfirmed parsing ─────────────────────────────────────────
describe("/start × ageConfirmed query", () => {
  it.each([
    ["1", true],
    ["true", false],
    ["yes", false],
    ["01", false],
    ["", false],
  ])("ageConfirmed=%j → cookie.ageConfirmed=%s", async (q, expected) => {
    const { rawCookie } = await doStart(`${ORIGIN}/api/auth/google/start?ageConfirmed=${q}`);
    expect(JSON.parse(rawCookie!).ageConfirmed).toBe(expected);
  });
  it("absent → false", async () => {
    const { rawCookie } = await doStart(`${ORIGIN}/api/auth/google/start`);
    expect(JSON.parse(rawCookie!).ageConfirmed).toBe(false);
  });
  it("cookie is httpOnly, lax, 10 min", async () => {
    const { res } = await doStart(`${ORIGIN}/api/auth/google/start?ageConfirmed=1`);
    const sc = res.headers.get("set-cookie")!.toLowerCase();
    expect(sc).toContain("httponly");
    expect(sc).toContain("samesite=lax");
    expect(sc).toContain("max-age=600");
  });
  it("not configured → 503 JSON (no redirect back to /login)", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    const { res } = await doStart(`${ORIGIN}/api/auth/google/start?ageConfirmed=1`);
    expect(res.status).toBe(503);
  });
  it("redirects only to accounts.google.com", async () => {
    const { res } = await doStart(`${ORIGIN}/api/auth/google/start`);
    expect(new URL(res.headers.get("location")!).host).toBe("accounts.google.com");
  });
});

// ── full matrix: page mode × tick × account state ────────────────────────
describe("page(mode,tick) × account state → terminal", () => {
  const accounts: AccountState[] = ["none", "password_by_email", "google_by_sub", "password_unverified"];
  const pages: Array<[PageMode, boolean]> = [
    ["login", false],
    ["login", true], // ticked earlier in signup then switched mode: still not sent
    ["signup", false],
    ["signup", true],
  ];
  for (const [mode, ticked] of pages) {
    for (const account of accounts) {
      it(`${mode}${ticked ? "+ticked" : ""} × ${account}`, async () => {
        await seedAccount(client, account, EMAIL, SUB);
        const before = await countUsers(client);
        const url = clientStartUrl(mode, ticked);
        if (url === null) {
          // BLOCKED_CLIENT: nothing reaches the server.
          expect(mode === "signup" && !ticked).toBe(true);
          return;
        }
        const r = await roundTrip(url, verified());
        const ageSent = mode === "signup" && ticked;
        if (account === "none" && !ageSent) {
          expect(r.path).toBe("/login");
          expect(r.error).toBe("google_age_required");
          expect(r.mode).toBe("signup");
          expect(await countUsers(client)).toBe(0);
          expect(setAuthCookie).not.toHaveBeenCalled();
        } else {
          expect(r.path).toBe("/");
          expect(r.error).toBeNull();
          expect(setAuthCookie).toHaveBeenCalledTimes(1);
          expect(await countUsers(client)).toBe(before + (account === "none" ? 1 : 0));
        }
      });
    }
  }

  it("existing password user is linked to the Google sub when Google verified the email", async () => {
    await seedAccount(client, "password_by_email", EMAIL, SUB);
    await roundTrip(clientStartUrl("login", false)!, verified());
    const row = (await client.execute("SELECT google_sub, auth_provider, email_verified FROM users")).rows[0];
    expect(row.google_sub).toBe(SUB);
    expect(row.auth_provider).toBe("password_google");
    expect(Number(row.email_verified)).toBe(1);
  });

  // EXPECTED TO FAIL (finding, pre-existing): when Google reports
  // email_verified=false the callback still signs the visitor into the
  // existing password account that owns that email (it only skips linking).
  // An email the Google account has not proven it controls must not unlock
  // someone else's account.
  it("Google email_verified=false must NOT sign into an existing password account", async () => {
    await seedAccount(client, "password_by_email", EMAIL, SUB);
    const r = await roundTrip(clientStartUrl("login", false)!, { ...verified(), email_verified: false });
    expect(setAuthCookie).not.toHaveBeenCalled();
    expect(r.path).toBe("/login");
  });

  it("brand-new user with unverified Google email + age → created with email_verified=0", async () => {
    const r = await roundTrip(clientStartUrl("signup", true)!, { ...verified(), email_verified: false });
    expect(r.path).toBe("/");
    const row = (await client.execute("SELECT email_verified, auth_provider FROM users")).rows[0];
    expect(Number(row.email_verified)).toBe(0);
    expect(row.auth_provider).toBe("google");
  });

  it("Google email in mixed case matches the lowercase stored account", async () => {
    await seedAccount(client, "password_by_email", EMAIL, SUB);
    const r = await roundTrip(clientStartUrl("login", false)!, verified("Cook@Example.TEST"));
    expect(r.path).toBe("/");
    expect(await countUsers(client)).toBe(1);
  });
});

// ── age-required recovery: the user's next transition ────────────────────
describe("google_age_required → recovery", () => {
  it("new user in login mode → age_required → ticks in signup → created", async () => {
    const first = await roundTrip(clientStartUrl("login", false)!, verified());
    expect(first.error).toBe("google_age_required");
    const second = await roundTrip(clientStartUrl("signup", true)!, verified());
    expect(second.path).toBe("/");
    expect(await countUsers(client)).toBe(1);
  });

  it("age_required redirect clears nothing harmful: stale cookie cannot be replayed into a creation", async () => {
    const s = await doStart(clientStartUrl("login", false)!);
    google.profile = verified();
    await doCallback({ state: s.state, code: "c1", cookie: s.cookiePair });
    const replay = await doCallback({ state: s.state, code: "c2", cookie: s.cookiePair });
    expect(replay.error).toBe("google_age_required");
    expect(await countUsers(client)).toBe(0);
  });
});

// ── entry contexts / returnTo ────────────────────────────────────────────
describe("entry context × returnTo", () => {
  const contexts: Array<[string, string, string]> = [
    ["household invitee", "/join/ABC123", "/join/ABC123"],
    ["shared-recipe visitor", "/shared/tok-1", "/shared/tok-1"],
    ["off-site returnTo", "https://evil.example/x", "/"],
    ["protocol-relative returnTo", "//evil.example", "/"],
    ["non-allow-listed app path", "/app/profile", "/"],
  ];
  it.each(contexts)("%s: new user signup+ticked lands on %s → %s", async (_ctx, returnTo, dest) => {
    const r = await roundTrip(clientStartUrl("signup", true, returnTo)!, verified());
    expect(r.loc.origin + r.path).toBe(ORIGIN + dest);
  });
  it.each(contexts.slice(0, 2))("%s: existing Google user, login mode → %s", async (_ctx, returnTo, dest) => {
    await seedAccount(client, "google_by_sub", EMAIL, SUB);
    const r = await roundTrip(clientStartUrl("login", false, returnTo)!, verified());
    expect(r.path).toBe(dest);
  });

  // EXPECTED TO FAIL (finding): the age_required redirect is built from
  // scratch and drops returnTo, so a new household invitee (or shared-recipe
  // visitor) who taps Google from the /join "Log in" button loses the invite
  // link: after ticking the box they land on "/" → /app, not /join/ABC123.
  it.each(contexts.slice(0, 2))(
    "%s: new user via login-mode Google → age_required keeps returnTo",
    async (_ctx, returnTo) => {
      const r = await roundTrip(clientStartUrl("login", false, returnTo)!, verified());
      expect(r.error).toBe("google_age_required");
      expect(r.loc.searchParams.get("returnTo")).toBe(returnTo);
    }
  );

  it("admin email: new Google user without age → age_required (no admin bypass)", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@example.test");
    const r = await roundTrip(clientStartUrl("login", false)!, verified("boss@example.test", "sub-boss"));
    expect(r.error).toBe("google_age_required");
    expect(await countUsers(client)).toBe(0);
  });
});

// ── forged / tampered / legacy cookies ───────────────────────────────────
describe("state cookie manipulation", () => {
  const forge = (payload: unknown) => cookieHeader(JSON.stringify(payload));

  // OBSERVATION: the age flag is a plain query param on a GET with no
  // CSRF/form binding, so any link (e.g. posted on a forum, or a "Continue"
  // button on another site) pre-attests age for the visitor; the visitor never
  // sees the question. Passes today; documents the gap.
  it("forged /start?ageConfirmed=1 from an external link creates a new account", async () => {
    const r = await roundTrip(`${ORIGIN}/api/auth/google/start?ageConfirmed=1&returnTo=/join/ABC123`, verified());
    expect(r.path).toBe("/join/ABC123");
    expect(await countUsers(client)).toBe(1);
  });

  it.each([
    ['"true"', "true"],
    ["1", 1],
    ['"1"', "1"],
    ["null", null],
    ["{}", {}],
  ])("cookie ageConfirmed=%s (non-boolean) + new user → age_required", async (_l, value) => {
    google.profile = verified();
    const r = await doCallback({ state: "s1", code: "c", cookie: forge({ state: "s1", returnTo: "/", ageConfirmed: value }) });
    expect(r.error).toBe("google_age_required");
    expect(await countUsers(client)).toBe(0);
  });

  it("old-format cookie (pre-deploy, no ageConfirmed) + new user → age_required", async () => {
    google.profile = verified();
    const r = await doCallback({ state: "s1", code: "c", cookie: forge({ state: "s1", returnTo: "/join/ABC123" }) });
    expect(r.error).toBe("google_age_required");
  });
  it.each(["password_by_email", "google_by_sub"] as AccountState[])(
    "old-format cookie + existing %s → signed in, returnTo kept",
    async (account) => {
      await seedAccount(client, account, EMAIL, SUB);
      google.profile = verified();
      const r = await doCallback({ state: "s1", code: "c", cookie: forge({ state: "s1", returnTo: "/join/ABC123" }) });
      expect(r.path).toBe("/join/ABC123");
    }
  );

  it.each([
    ["missing cookie", undefined, "s1"],
    ["not JSON", cookieHeader("{not json"), "s1"],
    ["state not a string", forge({ state: 42, ageConfirmed: true }), "42"],
    ["state mismatch", forge({ state: "other", ageConfirmed: true }), "s1"],
  ])("%s → google_state_mismatch, no row", async (_l, cookie, state) => {
    google.profile = verified();
    const r = await doCallback({ state, code: "c", cookie });
    expect(r.error).toBe("google_state_mismatch");
    expect(await countUsers(client)).toBe(0);
  });
  it("missing code → google_state_mismatch", async () => {
    const r = await doCallback({ state: "s1", cookie: forge({ state: "s1", ageConfirmed: true }) });
    expect(r.error).toBe("google_state_mismatch");
  });
  it("cookie returnTo tampered to off-site → '/'", async () => {
    google.profile = verified();
    const r = await doCallback({ state: "s1", code: "c", cookie: forge({ state: "s1", returnTo: "https://evil.example", ageConfirmed: true }) });
    expect(r.loc.origin + r.path).toBe(ORIGIN + "/");
  });
});

// ── provider / infrastructure edges ──────────────────────────────────────
describe("provider and infrastructure edges", () => {
  it("user cancels at Google → google_cancelled (even with valid cookie)", async () => {
    const s = await doStart(clientStartUrl("signup", true)!);
    const r = await doCallback({ state: s.state, error: "access_denied", cookie: s.cookiePair });
    expect(r.error).toBe("google_cancelled");
  });
  it("secret missing at callback → google_not_configured", async () => {
    const s = await doStart(clientStartUrl("signup", true)!);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const r = await doCallback({ state: s.state, code: "c", cookie: s.cookiePair });
    expect(r.error).toBe("google_not_configured");
  });
  it("token exchange rejected → google_login_failed", async () => {
    const s = await doStart(clientStartUrl("signup", true)!);
    google.tokenStatus = 400;
    const r = await doCallback({ state: s.state, code: "c", cookie: s.cookiePair });
    expect(r.error).toBe("google_login_failed");
  });
  it("id token signature invalid → google_login_failed, no row", async () => {
    const s = await doStart(clientStartUrl("signup", true)!);
    google.idToken = "invalid-signature";
    const r = await doCallback({ state: s.state, code: "c", cookie: s.cookiePair });
    expect(r.error).toBe("google_login_failed");
    expect(await countUsers(client)).toBe(0);
  });
  it("DB failure → google_login_failed (the 500 analogue)", async () => {
    const s = await doStart(clientStartUrl("signup", true)!);
    google.profile = verified();
    infra.dbBroken = true;
    const r = await doCallback({ state: s.state, code: "c", cookie: s.cookiePair });
    expect(r.error).toBe("google_login_failed");
  });
  it("double callback race for one new user → exactly one row, no crash", async () => {
    const s = await doStart(clientStartUrl("signup", true)!);
    google.profile = verified();
    const [a, b] = await Promise.all([
      doCallback({ state: s.state, code: "c1", cookie: s.cookiePair }),
      doCallback({ state: s.state, code: "c2", cookie: s.cookiePair }),
    ]);
    expect(await countUsers(client)).toBe(1);
    expect([a.res.status, b.res.status]).toEqual([307, 307]);
  });
});
