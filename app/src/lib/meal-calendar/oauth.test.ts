import { describe, expect, it } from "vitest";
import type { MealCalendarConfig } from "./config";
import {
  buildCalendarAuthorizationUrl,
  consumeCalendarOAuthState,
  createCalendarOAuthState,
  validateGrantedScopes,
} from "./oauth";
import {
  decryptCalendarSecret,
  encryptCalendarSecret,
} from "./crypto";

const key = "11".repeat(32);

describe("meal calendar OAuth and credential crypto", () => {
  it("round-trips an authenticated state and rejects tampering and expiry", async () => {
    const created = await createCalendarOAuthState({
      userId: 17,
      scope: { type: "household", id: 9 },
      returnTo: "/app?view=planner",
      encryptionKey: key,
      now: 1_000,
    });
    await expect(
      consumeCalendarOAuthState({
        state: created.state,
        cookieValue: created.cookieValue,
        encryptionKey: key,
        now: 2_000,
      })
    ).resolves.toMatchObject({
      userId: 17,
      scope: { type: "household", id: 9 },
      returnTo: "/app?view=planner",
    });
    await expect(
      consumeCalendarOAuthState({
        state: `${created.state}x`,
        cookieValue: created.cookieValue,
        encryptionKey: key,
        now: 2_000,
      })
    ).rejects.toThrow("invalid");
    await expect(
      consumeCalendarOAuthState({
        state: created.state,
        cookieValue: created.cookieValue,
        encryptionKey: key,
        now: 1_000 + 11 * 60_000,
      })
    ).rejects.toThrow("expired");
  });

  it("binds encrypted values to their context", async () => {
    const encrypted = await encryptCalendarSecret("refresh-secret", key, "refresh:1");
    await expect(decryptCalendarSecret(encrypted, key, "refresh:1")).resolves.toBe(
      "refresh-secret"
    );
    await expect(decryptCalendarSecret(encrypted, key, "access:1")).rejects.toThrow(
      "could not be decrypted"
    );
  });

  it("requests only identity, app-created Calendar, and ACL scopes", () => {
    const config: MealCalendarConfig = {
      enabled: true,
      clientId: "client",
      clientSecret: "secret",
      redirectUri: "https://example.test/api/meal-calendar/callback",
      encryptionKey: key,
      webhookUrl: "https://example.test/api/meal-calendar/webhook",
      syncSecret: "sync-secret",
      scopes: [
        "openid",
        "email",
        "https://www.googleapis.com/auth/calendar.app.created",
        "https://www.googleapis.com/auth/calendar.acls",
      ],
    };
    const url = new URL(buildCalendarAuthorizationUrl({ config, state: "state" }));
    const scopes = url.searchParams.get("scope")!.split(" ");
    expect(scopes).toContain("https://www.googleapis.com/auth/calendar.app.created");
    expect(scopes).toContain("https://www.googleapis.com/auth/calendar.acls");
    expect(scopes).not.toContain("https://www.googleapis.com/auth/calendar");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toContain("consent");
    expect(() => validateGrantedScopes(scopes.join(" "))).not.toThrow();
    expect(() =>
      validateGrantedScopes("openid email https://www.googleapis.com/auth/calendar.app.created")
    ).toThrow("required");
  });
});
