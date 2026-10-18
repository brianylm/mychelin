import { describe, expect, it } from "vitest";
import { hashCalendarToken } from "./crypto";
import { validateGoogleWatchNotification } from "./webhook";

describe("Google Calendar watch validation", () => {
  it("requires matching channel, resource, and hashed secret token", async () => {
    const watch = {
      channelId: "channel-1",
      resourceId: "resource-1",
      tokenHash: await hashCalendarToken("secret-token"),
      expiresAt: "2030-01-01T00:00:00.000Z",
    };
    const headers = new Headers({
      "x-goog-channel-id": "channel-1",
      "x-goog-resource-id": "resource-1",
      "x-goog-channel-token": "secret-token",
      "x-goog-resource-state": "exists",
      "x-goog-message-number": "7",
    });
    await expect(
      validateGoogleWatchNotification({ headers, watch, now: 1_700_000_000_000 })
    ).resolves.toEqual({ valid: true, resourceState: "exists", messageNumber: "7" });
    headers.set("x-goog-channel-token", "wrong");
    await expect(
      validateGoogleWatchNotification({ headers, watch, now: 1_700_000_000_000 })
    ).resolves.toEqual({ valid: false });
  });
});
