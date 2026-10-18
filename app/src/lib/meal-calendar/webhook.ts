import { hashCalendarToken, secureEqual } from "./crypto";

export interface StoredWatchIdentity {
  channelId: string;
  resourceId: string;
  tokenHash: string;
  expiresAt: string | null;
}

export async function validateGoogleWatchNotification(input: {
  headers: Headers;
  watch: StoredWatchIdentity | null;
  now?: number;
}): Promise<{ valid: true; resourceState: string; messageNumber: string | null } | { valid: false }> {
  if (!input.watch) return { valid: false };
  if (
    input.watch.expiresAt &&
    new Date(input.watch.expiresAt).getTime() < (input.now ?? Date.now())
  ) {
    return { valid: false };
  }
  const channelId = input.headers.get("x-goog-channel-id") || "";
  const resourceId = input.headers.get("x-goog-resource-id") || "";
  const token = input.headers.get("x-goog-channel-token") || "";
  if (
    !secureEqual(channelId, input.watch.channelId) ||
    !secureEqual(resourceId, input.watch.resourceId) ||
    !token
  ) {
    return { valid: false };
  }
  const tokenHash = await hashCalendarToken(token);
  if (!secureEqual(tokenHash, input.watch.tokenHash)) return { valid: false };
  return {
    valid: true,
    resourceState: input.headers.get("x-goog-resource-state") || "unknown",
    messageNumber: input.headers.get("x-goog-message-number"),
  };
}
