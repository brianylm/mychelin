import { db } from "@/db";
import { mealConflicts, mealGroups, type CalendarConnection } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  applyExternalDefrostTiming,
  applyExternalMealTiming,
  getMealGroupCalendarSource,
} from "@/lib/meal-pilot/service";
import type {
  CalendarActivityRecord,
  CalendarMealSource,
  ExternalTimingWriter,
} from "./types";
import type { CalendarSyncPersistence } from "./sync";
import {
  clearCalendarSyncToken,
  completeCalendarCatchup,
  deleteCalendarActivity,
  getCalendarActivity,
  getCalendarActivityByEvent,
  markCalendarActivityConflict,
  markCalendarActivityRemovedExternally,
  saveCalendarActivitySynced,
  upsertDesiredCalendarActivity,
} from "./store";

function activityRecord(
  activity: Awaited<ReturnType<typeof getCalendarActivity>>
): CalendarActivityRecord | null {
  if (!activity) return null;
  return {
    id: activity.id,
    connectionId: activity.connectionId,
    mealGroupId: activity.mealGroupId,
    kind: activity.kind as CalendarActivityRecord["kind"],
    googleEventId: activity.googleEventId,
    googleEtag: activity.googleEtag,
    startAt: activity.startAt,
    endAt: activity.endAt,
    state: activity.state as CalendarActivityRecord["state"],
    desiredRevision: activity.desiredRevision,
    syncedRevision: activity.syncedRevision,
    sourceMealRevision: activity.sourceMealRevision,
    explicitDurationMinutes: activity.explicitDurationMinutes,
  };
}

export const databaseCalendarSyncPersistence: CalendarSyncPersistence = {
  async getActivityByEvent(connectionId, eventId) {
    return activityRecord(
      await getCalendarActivityByEvent({ connectionId, googleEventId: eventId })
    );
  },
  async getActivity(input) {
    return activityRecord(await getCalendarActivity(input));
  },
  async upsertDesired(input) {
    const activity = await upsertDesiredCalendarActivity(input);
    return activityRecord(activity)!;
  },
  saveSynced: saveCalendarActivitySynced,
  markRemoved: markCalendarActivityRemovedExternally,
  markConflict: markCalendarActivityConflict,
  deleteActivity: deleteCalendarActivity,
  completeCatchup(connectionId, syncToken) {
    return completeCalendarCatchup({ connectionId, syncToken });
  },
  clearSyncToken: clearCalendarSyncToken,
};

export class CalendarScopeMismatchError extends Error {
  constructor() {
    super("Calendar job does not belong to this connection scope");
    this.name = "CalendarScopeMismatchError";
  }
}

export function calendarConnectionOwnsMealGroup(
  connection: Pick<CalendarConnection, "userId" | "householdId">,
  group: { userId: number; householdId: number | null }
): boolean {
  return connection.householdId != null
    ? group.householdId === connection.householdId
    : group.householdId == null && group.userId === connection.userId;
}

async function requireConnectionMealScope(
  connection: Pick<CalendarConnection, "userId" | "householdId">,
  mealGroupId: number
): Promise<boolean> {
  const [group] = await db
    .select({ userId: mealGroups.userId, householdId: mealGroups.householdId })
    .from(mealGroups)
    .where(eq(mealGroups.id, mealGroupId))
    .limit(1);
  if (!group) return false;
  if (!calendarConnectionOwnsMealGroup(connection, group)) {
    throw new CalendarScopeMismatchError();
  }
  return true;
}

export async function databaseCalendarMealSource(
  mealGroupId: number,
  connection: Pick<CalendarConnection, "userId" | "householdId">
): Promise<CalendarMealSource | null> {
  if (!(await requireConnectionMealScope(connection, mealGroupId))) return null;
  return getMealGroupCalendarSource(mealGroupId);
}

export function databaseExternalTimingWriter(
  connection: Pick<CalendarConnection, "userId" | "householdId">
): ExternalTimingWriter {
  return {
    async applyCookingTiming(input) {
      const result = await applyExternalMealTiming({
        mealGroupId: input.mealGroupId,
        expectedRevision: input.expectedRevision,
        serveAt: input.serveAt,
        durationOverrideMinutes: input.durationOverrideMinutes,
        actorUserId: connection.userId,
      });
      return result.status === "applied"
        ? { status: "applied", revision: result.mealGroup.revision }
        : result;
    },
    async applyDefrostTiming(input) {
      const result = await applyExternalDefrostTiming({
        mealGroupId: input.mealGroupId,
        expectedRevision: input.expectedRevision,
        defrostAtOverride: input.defrostAt,
        actorUserId: connection.userId,
      });
      return result.status === "applied"
        ? { status: "applied", revision: result.mealGroup.revision }
        : result;
    },
    async recordCalendarConflict(input) {
      if (!(await requireConnectionMealScope(connection, input.mealGroupId))) return;
      await db.insert(mealConflicts).values({
        mealGroupId: input.mealGroupId,
        kind: input.kind,
        message: input.message,
        details: input.details ? JSON.stringify(input.details) : null,
      });
    },
  };
}
