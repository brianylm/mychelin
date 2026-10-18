import type { MealCalendarConfig } from "./config";
import { randomOpaqueToken, hashCalendarToken } from "./crypto";
import { GoogleCalendarApiError, GoogleCalendarClient } from "./google-client";
import { validateGrantedScopes } from "./oauth";
import { resolveCalendarScope } from "./scope";
import {
  enqueueCalendarJob,
  enqueueInitialCalendarSync,
  getCalendarConnectionForScope,
  getCalendarShareById,
  listCalendarShares,
  markCalendarDisconnected,
  saveCalendarShare,
  saveConnectedCalendar,
  setCalendarConnectionState,
  updateCalendarWatch,
} from "./store";
import type { CalendarConnection } from "./store";
import { encryptCalendarCredentials, getCalendarAccessToken } from "./token-service";

export async function completeCalendarConnection(input: {
  userId: number;
  code: string;
  config: MealCalendarConfig;
  timezone?: string;
  client?: GoogleCalendarClient;
}) {
  const resolved = await resolveCalendarScope(input.userId);
  if (!resolved.canManage) {
    throw new Error("Only a household admin can connect the shared Mychelin calendar");
  }
  const client = input.client || new GoogleCalendarClient();
  const tokenSet = await client.exchangeCode({
    code: input.code,
    clientId: input.config.clientId,
    clientSecret: input.config.clientSecret,
    redirectUri: input.config.redirectUri,
  });
  validateGrantedScopes(tokenSet.scope);
  const profile = await client.getProfile(tokenSet.accessToken);
  if (!profile.email || profile.email_verified === false) {
    throw new Error("A verified Google account is required for Calendar sync");
  }

  const existing = await getCalendarConnectionForScope(resolved.scope);
  if (existing && existing.userId !== input.userId) {
    throw new Error(
      "The shared calendar is connected by another household admin. Disconnect it before changing owners."
    );
  }

  let calendarId = existing?.calendarId;
  let calendarName = existing?.calendarName || resolved.displayName;
  let calendarTimezone = existing?.calendarTimezone || input.timezone || "Asia/Singapore";
  if (!calendarId) {
    const calendar = await client.createCalendar({
      accessToken: tokenSet.accessToken,
      summary: calendarName,
      timezone: calendarTimezone,
    });
    calendarId = calendar.id;
    calendarName = calendar.summary || calendarName;
    calendarTimezone = calendar.timeZone || calendarTimezone;
  }

  const encrypted = await encryptCalendarCredentials({
    accessToken: tokenSet.accessToken,
    refreshToken: tokenSet.refreshToken!,
    encryptionKey: input.config.encryptionKey,
    userId: input.userId,
    householdId: resolved.householdId,
  });
  const connection = await saveConnectedCalendar(
    {
      userId: input.userId,
      householdId: resolved.householdId,
      googleAccountEmail: profile.email.toLowerCase(),
      grantedScopes: tokenSet.scope,
      calendarId,
      calendarName,
      calendarTimezone,
      ...encrypted,
      accessTokenExpiresAt: tokenSet.expiresAt,
    },
    existing?.id
  );

  const channelId = crypto.randomUUID();
  const channelToken = randomOpaqueToken(32);
  try {
    const watch = await client.watchEvents({
      accessToken: tokenSet.accessToken,
      calendarId,
      channelId,
      channelToken,
      webhookUrl: input.config.webhookUrl,
    });
    await updateCalendarWatch({
      connectionId: connection.id,
      channelId: watch.id,
      resourceId: watch.resourceId,
      tokenHash: await hashCalendarToken(channelToken),
      expiresAt: watch.expiration
        ? new Date(Number(watch.expiration)).toISOString()
        : null,
    });
  } catch {
    await setCalendarConnectionState({
      connectionId: connection.id,
      status: "paused",
      lastError: "Calendar connected, but change notifications are pending setup.",
    });
    await enqueueCalendarJob({
      connectionId: connection.id,
      action: "renew_watch",
      dedupeKey: `renew-watch:${connection.id}`,
    });
  }
  await enqueueInitialCalendarSync({
    connectionId: connection.id,
    userId: input.userId,
    householdId: resolved.householdId,
  });
  return connection;
}

// Already-removed ACL rules and expired channels are the desired end state.
function isGoogleNotFound(error: unknown): boolean {
  return error instanceof GoogleCalendarApiError && (error.status === 404 || error.status === 410);
}

export async function teardownCalendarConnection(input: {
  connection: CalendarConnection;
  config: MealCalendarConfig;
  client?: GoogleCalendarClient;
}): Promise<void> {
  const client = input.client || new GoogleCalendarClient();
  const accessToken = await getCalendarAccessToken({
    connection: input.connection,
    config: input.config,
    client,
  });
  const shares = await listCalendarShares(input.connection.id);
  for (const share of shares) {
    if (share.status !== "revoked" && share.googleAclRuleId) {
      try {
        await client.revokeCalendarShare({
          accessToken,
          calendarId: input.connection.calendarId,
          ruleId: share.googleAclRuleId,
        });
      } catch (error) {
        if (!isGoogleNotFound(error)) throw error;
      }
      await saveCalendarShare({
        connectionId: input.connection.id,
        userId: share.userId,
        email: share.email,
        status: "revoked",
      });
    }
  }
  if (input.connection.watchChannelId && input.connection.watchResourceId) {
    try {
      await client.stopChannel({
        accessToken,
        channelId: input.connection.watchChannelId,
        resourceId: input.connection.watchResourceId,
      });
    } catch (error) {
      if (!isGoogleNotFound(error)) throw error;
    }
  }
  await markCalendarDisconnected(input.connection.id);
}

export async function revokeQueuedCalendarShare(input: {
  connection: CalendarConnection;
  shareId: number;
  config: MealCalendarConfig;
  client?: GoogleCalendarClient;
}): Promise<void> {
  const share = await getCalendarShareById({
    connectionId: input.connection.id,
    shareId: input.shareId,
  });
  if (!share || share.status === "revoked") return;
  const client = input.client || new GoogleCalendarClient();
  const accessToken = await getCalendarAccessToken({
    connection: input.connection,
    config: input.config,
    client,
  });
  if (share.googleAclRuleId) {
    try {
      await client.revokeCalendarShare({
        accessToken,
        calendarId: input.connection.calendarId,
        ruleId: share.googleAclRuleId,
      });
    } catch (error) {
      if (!isGoogleNotFound(error)) throw error;
    }
  }
  await saveCalendarShare({
    connectionId: input.connection.id,
    userId: share.userId,
    email: share.email,
    status: "revoked",
  });
}

export async function disconnectCalendar(input: {
  userId: number;
  config: MealCalendarConfig;
  client?: GoogleCalendarClient;
}): Promise<void> {
  const resolved = await resolveCalendarScope(input.userId);
  if (!resolved.canManage) {
    throw new Error("Only a household admin can disconnect the shared calendar");
  }
  const connection = await getCalendarConnectionForScope(resolved.scope);
  if (!connection) return;
  await teardownCalendarConnection({
    connection,
    config: input.config,
    client: input.client,
  });
}
