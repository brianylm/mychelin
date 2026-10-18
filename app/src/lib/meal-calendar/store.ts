import { db } from "@/db";
import {
  calendarActivities,
  calendarConnections,
  calendarShares,
  calendarSyncJobs,
  mealGroups,
  type CalendarActivity,
  type CalendarConnection,
  type CalendarShare,
  type CalendarSyncJob,
} from "@/db/schema";
import { and, asc, eq, isNull, lt, lte, or, sql } from "drizzle-orm";
import type { CalendarEventDraft, CalendarScope } from "./types";
import { randomOpaqueToken } from "./crypto";

export type {
  CalendarActivity,
  CalendarConnection,
  CalendarShare,
  CalendarSyncJob,
};

export interface ConnectedCalendarInput {
  userId: number;
  householdId: number | null;
  googleAccountEmail: string;
  grantedScopes: string;
  calendarId: string;
  calendarName: string;
  calendarTimezone: string;
  accessTokenCiphertext: string;
  accessTokenIv: string;
  refreshTokenCiphertext: string;
  refreshTokenIv: string;
  accessTokenExpiresAt: string;
}

export interface ClaimedCalendarJob extends CalendarSyncJob {
  leaseToken: string;
}

export async function getCalendarConnectionForScope(
  scope: CalendarScope
): Promise<CalendarConnection | null> {
  const condition =
    scope.type === "household"
      ? eq(calendarConnections.householdId, scope.id)
      : and(eq(calendarConnections.userId, scope.id), isNull(calendarConnections.householdId));
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(and(condition, isNull(calendarConnections.disconnectedAt)))
    .limit(1);
  return connection || null;
}

export async function getCalendarConnectionById(
  connectionId: number
): Promise<CalendarConnection | null> {
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.id, connectionId))
    .limit(1);
  return connection || null;
}

export async function getCalendarConnectionByWatchChannel(
  channelId: string
): Promise<CalendarConnection | null> {
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.watchChannelId, channelId),
        isNull(calendarConnections.disconnectedAt)
      )
    )
    .limit(1);
  return connection || null;
}

export async function saveConnectedCalendar(
  input: ConnectedCalendarInput,
  existingConnectionId?: number
): Promise<CalendarConnection> {
  const now = new Date().toISOString();
  return db.transaction(async (tx) => {
    if (existingConnectionId) {
      const [updated] = await tx
        .update(calendarConnections)
        .set({
          googleAccountEmail: input.googleAccountEmail,
          grantedScopes: input.grantedScopes,
          calendarId: input.calendarId,
          calendarName: input.calendarName,
          calendarTimezone: input.calendarTimezone,
          status: "connected",
          accessTokenCiphertext: input.accessTokenCiphertext,
          accessTokenIv: input.accessTokenIv,
          refreshTokenCiphertext: input.refreshTokenCiphertext,
          refreshTokenIv: input.refreshTokenIv,
          accessTokenExpiresAt: input.accessTokenExpiresAt,
          tokenInvalidatedAt: null,
          disconnectedAt: null,
          lastError: null,
          revision: sql`${calendarConnections.revision} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(calendarConnections.id, existingConnectionId),
            eq(calendarConnections.userId, input.userId)
          )
        )
        .returning();
      if (!updated) throw new Error("Calendar connection is no longer available");
      return updated;
    }
    const [created] = await tx
      .insert(calendarConnections)
      .values({ ...input, status: "connected", createdAt: now, updatedAt: now })
      .returning();
    return created;
  });
}

export async function updateCalendarAccessToken(input: {
  connectionId: number;
  accessTokenCiphertext: string;
  accessTokenIv: string;
  accessTokenExpiresAt: string;
}): Promise<void> {
  await db
    .update(calendarConnections)
    .set({
      accessTokenCiphertext: input.accessTokenCiphertext,
      accessTokenIv: input.accessTokenIv,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      lastError: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(calendarConnections.id, input.connectionId));
}

export async function markCalendarConnectionNeedsReauth(
  connectionId: number,
  message: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(calendarConnections)
    .set({
      status: "needs_reauth",
      tokenInvalidatedAt: now,
      accessTokenCiphertext: null,
      accessTokenIv: null,
      lastError: message,
      updatedAt: now,
    })
    .where(eq(calendarConnections.id, connectionId));
}

export async function setCalendarConnectionState(input: {
  connectionId: number;
  status: "connected" | "paused" | "needs_reauth";
  lastError?: string | null;
}): Promise<void> {
  await db
    .update(calendarConnections)
    .set({
      status: input.status,
      lastError: input.lastError ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(calendarConnections.id, input.connectionId));
}

export async function updateCalendarWatch(input: {
  connectionId: number;
  channelId: string;
  resourceId: string;
  tokenHash: string;
  expiresAt: string | null;
}): Promise<void> {
  await db
    .update(calendarConnections)
    .set({
      watchChannelId: input.channelId,
      watchResourceId: input.resourceId,
      watchTokenHash: input.tokenHash,
      watchExpiresAt: input.expiresAt,
      status: "connected",
      lastError: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(calendarConnections.id, input.connectionId));
}

export async function completeCalendarCatchup(input: {
  connectionId: number;
  syncToken: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(calendarConnections)
    .set({ syncToken: input.syncToken, lastSyncedAt: now, lastError: null, updatedAt: now })
    .where(eq(calendarConnections.id, input.connectionId));
}

export async function clearCalendarSyncToken(connectionId: number): Promise<void> {
  await db
    .update(calendarConnections)
    .set({ syncToken: null, updatedAt: new Date().toISOString() })
    .where(eq(calendarConnections.id, connectionId));
}

export async function markCalendarDisconnected(connectionId: number): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(calendarConnections)
    .set({
      status: "disconnected",
      accessTokenCiphertext: null,
      accessTokenIv: null,
      refreshTokenCiphertext: "",
      refreshTokenIv: "",
      syncToken: null,
      watchChannelId: null,
      watchResourceId: null,
      watchTokenHash: null,
      watchExpiresAt: null,
      disconnectedAt: now,
      updatedAt: now,
    })
    .where(eq(calendarConnections.id, connectionId));
}

export async function listCalendarShares(
  connectionId: number
): Promise<CalendarShare[]> {
  return db
    .select()
    .from(calendarShares)
    .where(eq(calendarShares.connectionId, connectionId));
}

export async function getCalendarShare(input: {
  connectionId: number;
  userId: number;
}): Promise<CalendarShare | null> {
  const [share] = await db
    .select()
    .from(calendarShares)
    .where(
      and(
        eq(calendarShares.connectionId, input.connectionId),
        eq(calendarShares.userId, input.userId)
      )
    )
    .limit(1);
  return share || null;
}

export async function getCalendarShareById(input: {
  connectionId: number;
  shareId: number;
}): Promise<CalendarShare | null> {
  const [share] = await db
    .select()
    .from(calendarShares)
    .where(
      and(
        eq(calendarShares.id, input.shareId),
        eq(calendarShares.connectionId, input.connectionId)
      )
    )
    .limit(1);
  return share || null;
}

export async function saveCalendarShare(input: {
  connectionId: number;
  userId: number;
  email: string;
  status: string;
  googleAclRuleId?: string | null;
  lastError?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(calendarShares)
    .values({ ...input, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [calendarShares.connectionId, calendarShares.userId],
      set: {
        email: input.email,
        status: input.status,
        googleAclRuleId: input.googleAclRuleId ?? null,
        lastError: input.lastError ?? null,
        updatedAt: now,
      },
    });
}

export async function getCalendarActivityByEvent(input: {
  connectionId: number;
  googleEventId: string;
}): Promise<CalendarActivity | null> {
  const [activity] = await db
    .select()
    .from(calendarActivities)
    .where(
      and(
        eq(calendarActivities.connectionId, input.connectionId),
        eq(calendarActivities.googleEventId, input.googleEventId)
      )
    )
    .limit(1);
  return activity || null;
}

export async function getCalendarActivity(input: {
  connectionId: number;
  mealGroupId: number;
  kind: "cooking" | "defrost";
}): Promise<CalendarActivity | null> {
  const [activity] = await db
    .select()
    .from(calendarActivities)
    .where(
      and(
        eq(calendarActivities.connectionId, input.connectionId),
        eq(calendarActivities.mealGroupId, input.mealGroupId),
        eq(calendarActivities.kind, input.kind)
      )
    )
    .limit(1);
  return activity || null;
}

export async function upsertDesiredCalendarActivity(input: {
  connectionId: number;
  eventId: string;
  draft: CalendarEventDraft;
}): Promise<CalendarActivity> {
  const now = new Date().toISOString();
  const [activity] = await db
    .insert(calendarActivities)
    .values({
      connectionId: input.connectionId,
      mealGroupId: input.draft.mealGroupId,
      kind: input.draft.kind,
      googleEventId: input.eventId,
      startAt: input.draft.startAt,
      endAt: input.draft.endAt,
      state: "pending",
      desiredRevision: input.draft.mealRevision,
      sourceMealRevision: input.draft.mealRevision,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        calendarActivities.connectionId,
        calendarActivities.mealGroupId,
        calendarActivities.kind,
      ],
      set: {
        googleEventId: input.eventId,
        startAt: input.draft.startAt,
        endAt: input.draft.endAt,
        state: "pending",
        desiredRevision: input.draft.mealRevision,
        sourceMealRevision: input.draft.mealRevision,
        deletedExternallyAt: null,
        lastError: null,
        updatedAt: now,
      },
    })
    .returning();
  return activity;
}

export async function saveCalendarActivitySynced(input: {
  activityId: number;
  etag: string;
  startAt: string;
  endAt: string;
  mealRevision: number;
  explicitDurationMinutes?: number | null;
}): Promise<void> {
  await db
    .update(calendarActivities)
    .set({
      googleEtag: input.etag,
      startAt: input.startAt,
      endAt: input.endAt,
      explicitDurationMinutes: input.explicitDurationMinutes ?? null,
      state: "synced",
      desiredRevision: input.mealRevision,
      syncedRevision: input.mealRevision,
      sourceMealRevision: input.mealRevision,
      deletedExternallyAt: null,
      lastError: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(calendarActivities.id, input.activityId));
}

export async function markCalendarActivityRemovedExternally(
  activityId: number
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(calendarActivities)
    .set({ state: "removed", deletedExternallyAt: now, updatedAt: now })
    .where(eq(calendarActivities.id, activityId));
}

export async function markCalendarActivityConflict(
  activityId: number,
  message: string
): Promise<void> {
  await db
    .update(calendarActivities)
    .set({ state: "conflict", lastError: message, updatedAt: new Date().toISOString() })
    .where(eq(calendarActivities.id, activityId));
}

export async function deleteCalendarActivity(activityId: number): Promise<void> {
  await db.delete(calendarActivities).where(eq(calendarActivities.id, activityId));
}

export async function enqueueCalendarJob(input: {
  connectionId: number;
  mealGroupId?: number | null;
  shareId?: number | null;
  kind?: "cooking" | "defrost" | null;
  action: string;
  dedupeKey: string;
  notBefore?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(calendarSyncJobs)
    .values({
      connectionId: input.connectionId,
      mealGroupId: input.mealGroupId ?? null,
      shareId: input.shareId ?? null,
      kind: input.kind ?? null,
      action: input.action,
      dedupeKey: input.dedupeKey,
      status: "pending",
      attempts: 0,
      notBefore: input.notBefore || now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: calendarSyncJobs.dedupeKey,
      set: {
        action: input.action,
        status: "pending",
        attempts: 0,
        notBefore: input.notBefore || now,
        leasedAt: null,
        leaseToken: null,
        lastError: null,
        updatedAt: now,
      },
    });
}

export async function queueCalendarMemberDeparture(input: {
  householdId: number;
  userId: number;
}): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const [connection] = await tx
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.householdId, input.householdId),
          isNull(calendarConnections.disconnectedAt)
        )
      )
      .limit(1);
    if (!connection) return;
    if (connection.userId === input.userId) {
      await tx
        .update(calendarConnections)
        .set({
          status: "paused",
          lastError: "The Google Calendar owner left this household. Reconnect as an admin.",
          updatedAt: now,
        })
        .where(eq(calendarConnections.id, connection.id));
      await tx
        .insert(calendarSyncJobs)
        .values({
          connectionId: connection.id,
          action: "teardown_connection",
          dedupeKey: `teardown:${connection.id}`,
          status: "pending",
          attempts: 0,
          notBefore: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: calendarSyncJobs.dedupeKey,
          set: {
            status: "pending",
            attempts: 0,
            notBefore: now,
            leasedAt: null,
            leaseToken: null,
            lastError: null,
            updatedAt: now,
          },
        });
      return;
    }
    const [share] = await tx
      .select()
      .from(calendarShares)
      .where(
        and(
          eq(calendarShares.connectionId, connection.id),
          eq(calendarShares.userId, input.userId)
        )
      )
      .limit(1);
    if (!share || share.status === "revoked") return;
    await tx
      .update(calendarShares)
      .set({ status: "revocation_pending", updatedAt: now })
      .where(eq(calendarShares.id, share.id));
    await tx
      .insert(calendarSyncJobs)
      .values({
        connectionId: connection.id,
        shareId: share.id,
        action: "unshare",
        dedupeKey: `unshare:${connection.id}:${share.id}`,
        status: "pending",
        attempts: 0,
        notBefore: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: calendarSyncJobs.dedupeKey,
        set: {
          status: "pending",
          attempts: 0,
          notBefore: now,
          leasedAt: null,
          leaseToken: null,
          lastError: null,
          updatedAt: now,
        },
      });
  });
}

export async function queueCalendarHouseholdDeletion(householdId: number): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const [connection] = await tx
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.householdId, householdId),
          isNull(calendarConnections.disconnectedAt)
        )
      )
      .limit(1);
    if (!connection) return;
    await tx
      .update(calendarConnections)
      .set({
        status: "paused",
        lastError: "The household was deleted. Calendar sharing is being removed.",
        updatedAt: now,
      })
      .where(eq(calendarConnections.id, connection.id));
    await tx
      .insert(calendarSyncJobs)
      .values({
        connectionId: connection.id,
        action: "teardown_connection",
        dedupeKey: `teardown:${connection.id}`,
        status: "pending",
        attempts: 0,
        notBefore: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: calendarSyncJobs.dedupeKey,
        set: {
          status: "pending",
          attempts: 0,
          notBefore: now,
          leasedAt: null,
          leaseToken: null,
          lastError: null,
          updatedAt: now,
        },
      });
  });
}

export async function enqueueMealCalendarSync(
  mealGroupId: number,
  _desiredRevision: number
): Promise<void> {
  const [meal] = await db
    .select({ userId: mealGroups.userId, householdId: mealGroups.householdId })
    .from(mealGroups)
    .where(eq(mealGroups.id, mealGroupId))
    .limit(1);
  if (!meal) return;
  const connection = await getCalendarConnectionForScope(
    meal.householdId
      ? { type: "household", id: meal.householdId }
      : { type: "solo", id: meal.userId }
  );
  if (!connection || connection.status !== "connected") return;
  await db.transaction(async (tx) => {
    const now = new Date().toISOString();
    for (const kind of ["cooking", "defrost"] as const) {
      const dedupeKey = `meal:${connection.id}:${mealGroupId}:${kind}`;
      await tx
        .insert(calendarSyncJobs)
        .values({
          connectionId: connection.id,
          mealGroupId,
          kind,
          action: "sync_activity",
          dedupeKey,
          status: "pending",
          attempts: 0,
          notBefore: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: calendarSyncJobs.dedupeKey,
          set: {
            action: "sync_activity",
            status: "pending",
            attempts: 0,
            notBefore: now,
            leasedAt: null,
            leaseToken: null,
            lastError: null,
            updatedAt: now,
          },
        });
    }
  });
}

// Called by meal routes after a mutation has committed. The user's change
// must not fail because calendar bookkeeping did; a missed enqueue is
// repaired by the next edit of the same meal.
export async function requestMealCalendarSync(
  mealGroupId: number,
  revision: number
): Promise<void> {
  try {
    await enqueueMealCalendarSync(mealGroupId, revision);
  } catch (error) {
    console.error("Meal calendar sync enqueue failed", { mealGroupId, error });
  }
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DELETE_EVENT_PREFIX = "delete_event";

// Deleting a meal cascades its calendar_activities and meal-scoped jobs,
// which would orphan the Google events. Run inside the deleting
// transaction: it queues one connection-scoped job per mapped event. The
// event id travels in the dedupe key because jobs carry no payload column;
// Google event ids are base32hex, so they never contain the ':' separator.
export async function queueMealCalendarRemoval(
  tx: DbTransaction,
  mealGroupId: number
): Promise<void> {
  const activities = await tx
    .select({
      connectionId: calendarActivities.connectionId,
      googleEventId: calendarActivities.googleEventId,
    })
    .from(calendarActivities)
    .where(eq(calendarActivities.mealGroupId, mealGroupId));
  const now = new Date().toISOString();
  for (const activity of activities) {
    if (!activity.googleEventId) continue;
    await tx
      .insert(calendarSyncJobs)
      .values({
        connectionId: activity.connectionId,
        action: DELETE_EVENT_PREFIX,
        dedupeKey: `${DELETE_EVENT_PREFIX}:${activity.connectionId}:${activity.googleEventId}`,
        status: "pending",
        attempts: 0,
        notBefore: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: calendarSyncJobs.dedupeKey });
  }
}

export function deletedEventIdFromJob(job: Pick<CalendarSyncJob, "action" | "dedupeKey">): string | null {
  if (job.action !== DELETE_EVENT_PREFIX) return null;
  const eventId = job.dedupeKey.split(":")[2];
  return eventId || null;
}

export async function enqueueInitialCalendarSync(input: {
  connectionId: number;
  userId: number;
  householdId: number | null;
}): Promise<void> {
  const groups = await db
    .select({ id: mealGroups.id })
    .from(mealGroups)
    .where(
      and(
        input.householdId != null
          ? eq(mealGroups.householdId, input.householdId)
          : and(eq(mealGroups.userId, input.userId), isNull(mealGroups.householdId)),
        eq(mealGroups.status, "planned")
      )
    );
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const jobs: Array<{
      mealGroupId: number | null;
      kind: "cooking" | "defrost" | null;
      action: string;
      dedupeKey: string;
    }> = [
      {
        mealGroupId: null,
        kind: null,
        action: "catchup",
        dedupeKey: `catchup:${input.connectionId}`,
      },
      ...groups.flatMap((group) =>
        (["cooking", "defrost"] as const).map((kind) => ({
          mealGroupId: group.id,
          kind,
          action: "sync_activity",
          dedupeKey: `meal:${input.connectionId}:${group.id}:${kind}`,
        }))
      ),
    ];
    for (const job of jobs) {
      await tx
        .insert(calendarSyncJobs)
        .values({
          connectionId: input.connectionId,
          mealGroupId: job.mealGroupId,
          kind: job.kind,
          action: job.action,
          dedupeKey: job.dedupeKey,
          status: "pending",
          attempts: 0,
          notBefore: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: calendarSyncJobs.dedupeKey,
          set: {
            status: "pending",
            attempts: 0,
            notBefore: now,
            leasedAt: null,
            leaseToken: null,
            lastError: null,
            updatedAt: now,
          },
        });
    }
  });
}

export async function claimDueCalendarJobs(
  limit = 10,
  now = new Date()
): Promise<ClaimedCalendarJob[]> {
  const nowIso = now.toISOString();
  const staleIso = new Date(now.getTime() - 10 * 60_000).toISOString();
  return db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(calendarSyncJobs)
      .where(
        and(
          lte(calendarSyncJobs.notBefore, nowIso),
          or(
            eq(calendarSyncJobs.status, "pending"),
            eq(calendarSyncJobs.status, "failed"),
            and(
              eq(calendarSyncJobs.status, "processing"),
              or(isNull(calendarSyncJobs.leasedAt), lt(calendarSyncJobs.leasedAt, staleIso))
            )
          )
        )
      )
      .orderBy(asc(calendarSyncJobs.notBefore), asc(calendarSyncJobs.id))
      .limit(Math.max(1, Math.min(limit, 50)));

    const claimed: ClaimedCalendarJob[] = [];
    for (const job of due) {
      const leaseToken = randomOpaqueToken();
      const [updated] = await tx
        .update(calendarSyncJobs)
        .set({
          status: "processing",
          leasedAt: nowIso,
          leaseToken,
          attempts: sql`${calendarSyncJobs.attempts} + 1`,
          updatedAt: nowIso,
        })
        .where(
          and(
            eq(calendarSyncJobs.id, job.id),
            or(
              eq(calendarSyncJobs.status, "pending"),
              eq(calendarSyncJobs.status, "failed"),
              and(
                eq(calendarSyncJobs.status, "processing"),
                or(isNull(calendarSyncJobs.leasedAt), lt(calendarSyncJobs.leasedAt, staleIso))
              )
            )
          )
        )
        .returning();
      if (updated) claimed.push({ ...updated, leaseToken });
    }
    return claimed;
  });
}

export async function completeCalendarJob(input: {
  jobId: number;
  leaseToken: string;
}): Promise<void> {
  await db
    .update(calendarSyncJobs)
    .set({
      status: "completed",
      leasedAt: null,
      leaseToken: null,
      lastError: null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(calendarSyncJobs.id, input.jobId),
        eq(calendarSyncJobs.leaseToken, input.leaseToken)
      )
    );
}

export async function failCalendarJob(input: {
  job: ClaimedCalendarJob;
  message: string;
  now?: Date;
}): Promise<void> {
  const now = input.now || new Date();
  const delayMinutes = Math.min(2 ** Math.min(input.job.attempts, 8), 240);
  await db
    .update(calendarSyncJobs)
    .set({
      status: "failed",
      notBefore: new Date(now.getTime() + delayMinutes * 60_000).toISOString(),
      leasedAt: null,
      leaseToken: null,
      lastError: input.message.slice(0, 500),
      updatedAt: now.toISOString(),
    })
    .where(
      and(
        eq(calendarSyncJobs.id, input.job.id),
        eq(calendarSyncJobs.leaseToken, input.job.leaseToken)
      )
    );
}
