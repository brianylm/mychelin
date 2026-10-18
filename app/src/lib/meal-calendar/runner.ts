import type { MealCalendarConfig } from "./config";
import { randomOpaqueToken, hashCalendarToken } from "./crypto";
import {
  databaseCalendarMealSource,
  databaseCalendarSyncPersistence,
  databaseExternalTimingWriter,
} from "./database";
import { GoogleCalendarApiError, GoogleCalendarClient } from "./google-client";
import { isHouseholdMember } from "@/lib/households";
import {
  catchUpCalendarChanges,
  syncCalendarActivity,
} from "./sync";
import {
  claimDueCalendarJobs,
  completeCalendarJob,
  deletedEventIdFromJob,
  failCalendarJob,
  getCalendarConnectionById,
  setCalendarConnectionState,
  updateCalendarWatch,
  type ClaimedCalendarJob,
} from "./store";
import { getCalendarAccessToken } from "./token-service";
import { revokeQueuedCalendarShare, teardownCalendarConnection } from "./connection-service";

async function renewWatch(input: {
  connection: NonNullable<Awaited<ReturnType<typeof getCalendarConnectionById>>>;
  accessToken: string;
  config: MealCalendarConfig;
  client: GoogleCalendarClient;
}): Promise<void> {
  const channelId = crypto.randomUUID();
  const channelToken = randomOpaqueToken(32);
  const watch = await input.client.watchEvents({
    accessToken: input.accessToken,
    calendarId: input.connection.calendarId,
    channelId,
    channelToken,
    webhookUrl: input.config.webhookUrl,
  });
  await updateCalendarWatch({
    connectionId: input.connection.id,
    channelId: watch.id,
    resourceId: watch.resourceId,
    tokenHash: await hashCalendarToken(channelToken),
    expiresAt: watch.expiration ? new Date(Number(watch.expiration)).toISOString() : null,
  });
  if (input.connection.watchChannelId && input.connection.watchResourceId) {
    try {
      await input.client.stopChannel({
        accessToken: input.accessToken,
        channelId: input.connection.watchChannelId,
        resourceId: input.connection.watchResourceId,
      });
    } catch (error) {
      // The replacement watch is already durable. An old channel is harmless
      // until expiry; only suppress missing/already-expired channels.
      if (!(error instanceof GoogleCalendarApiError) || error.status !== 404) throw error;
    }
  }
}

export async function processCalendarJob(input: {
  job: ClaimedCalendarJob;
  config: MealCalendarConfig;
  client?: GoogleCalendarClient;
}): Promise<void> {
  const connection = await getCalendarConnectionById(input.job.connectionId);
  if (!connection || connection.disconnectedAt) return;
  // Removal work runs before the membership/status guards: departures and
  // household deletion pause the connection, and the owner may already have
  // left, yet access must still be revoked and deleted meals removed.
  if (input.job.action === "teardown_connection") {
    await teardownCalendarConnection({ connection, config: input.config, client: input.client });
    return;
  }
  if (input.job.action === "unshare") {
    if (!input.job.shareId) throw new Error("Unshare job is missing its share");
    await revokeQueuedCalendarShare({
      connection,
      shareId: input.job.shareId,
      config: input.config,
      client: input.client,
    });
    return;
  }
  const deletedEventId = deletedEventIdFromJob(input.job);
  if (deletedEventId) {
    const client = input.client || new GoogleCalendarClient();
    const accessToken = await getCalendarAccessToken({ connection, config: input.config, client });
    try {
      await client.deleteEvent({
        accessToken,
        calendarId: connection.calendarId,
        eventId: deletedEventId,
      });
    } catch (error) {
      if (!(error instanceof GoogleCalendarApiError && (error.status === 404 || error.status === 410))) {
        throw error;
      }
    }
    return;
  }
  if (
    connection.householdId != null &&
    !(await isHouseholdMember(connection.userId, connection.householdId))
  ) {
    await setCalendarConnectionState({
      connectionId: connection.id,
      status: "paused",
      lastError: "The Google Calendar owner left this household. Reconnect as an admin.",
    });
    throw new Error("Calendar owner is no longer a household member");
  }
  if (connection.status === "needs_reauth") {
    throw new Error("Google Calendar must be reconnected");
  }
  if (connection.status !== "connected" && input.job.action !== "renew_watch") {
    throw new Error("Google Calendar sync is paused");
  }
  const client = input.client || new GoogleCalendarClient();
  const accessToken = await getCalendarAccessToken({
    connection,
    config: input.config,
    client,
  });
  const timingWriter = databaseExternalTimingWriter(connection);

  if (input.job.action === "catchup") {
    await catchUpCalendarChanges({
      connectionId: connection.id,
      calendarId: connection.calendarId,
      accessToken,
      syncToken: connection.syncToken,
      client,
      persistence: databaseCalendarSyncPersistence,
      timingWriter,
    });
    return;
  }
  if (input.job.action === "renew_watch") {
    await renewWatch({ connection, accessToken, config: input.config, client });
    return;
  }
  if (
    input.job.action === "sync_activity" &&
    input.job.mealGroupId &&
    (input.job.kind === "cooking" || input.job.kind === "defrost")
  ) {
    const source = await databaseCalendarMealSource(input.job.mealGroupId, connection);
    await syncCalendarActivity({
      connectionId: connection.id,
      calendarId: connection.calendarId,
      accessToken,
      mealGroupId: input.job.mealGroupId,
      kind: input.job.kind,
      source,
      appBaseUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://mychelin-sg.vercel.app",
      defrostTime: "18:00",
      defrostAtOverride: source?.mealGroup.defrostAtOverride,
      client,
      persistence: databaseCalendarSyncPersistence,
      timingWriter,
    });
    return;
  }
  throw new Error(`Unsupported calendar job action: ${input.job.action}`);
}

export async function runDueCalendarJobs(input: {
  config: MealCalendarConfig;
  limit?: number;
  client?: GoogleCalendarClient;
}): Promise<{ claimed: number; completed: number; failed: number }> {
  const jobs = await claimDueCalendarJobs(input.limit || 10);
  let completed = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      await processCalendarJob({ job, config: input.config, client: input.client });
      await completeCalendarJob({ jobId: job.id, leaseToken: job.leaseToken });
      completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Calendar sync failed";
      await failCalendarJob({ job, message });
      if (message.includes("reconnect")) {
        await setCalendarConnectionState({
          connectionId: job.connectionId,
          status: "needs_reauth",
          lastError: message,
        });
      }
      failed += 1;
    }
  }
  return { claimed: jobs.length, completed, failed };
}
