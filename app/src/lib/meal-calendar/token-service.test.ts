import { describe, expect, it, vi } from "vitest";
import type { MealCalendarConfig } from "./config";
import { GoogleCalendarClient } from "./google-client";
import type { CalendarConnection } from "./store";
import {
  encryptCalendarCredentials,
  getCalendarAccessToken,
} from "./token-service";

const key = "22".repeat(32);
const config: MealCalendarConfig = {
  enabled: true,
  clientId: "client",
  clientSecret: "secret",
  redirectUri: "https://example.test/callback",
  encryptionKey: key,
  webhookUrl: "https://example.test/webhook",
  syncSecret: "sync",
  scopes: [],
};

describe("calendar token refresh", () => {
  it("marks a connection for reauthorization on invalid_grant", async () => {
    const encrypted = await encryptCalendarCredentials({
      accessToken: "old-access",
      refreshToken: "old-refresh",
      encryptionKey: key,
      userId: 7,
      householdId: null,
    });
    const connection = {
      id: 1,
      userId: 7,
      householdId: null,
      ...encrypted,
      accessTokenExpiresAt: "2020-01-01T00:00:00.000Z",
    } as CalendarConnection;
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ error: "invalid_grant" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;
    const markNeedsReauth = vi.fn(async () => undefined);
    await expect(
      getCalendarAccessToken({
        connection,
        config,
        client: new GoogleCalendarClient(fetcher),
        persistence: {
          updateAccessToken: vi.fn(async () => undefined),
          markNeedsReauth,
        },
      })
    ).rejects.toThrow("no longer valid");
    expect(markNeedsReauth).toHaveBeenCalledWith(
      1,
      expect.stringContaining("Reconnect")
    );
  });
});
