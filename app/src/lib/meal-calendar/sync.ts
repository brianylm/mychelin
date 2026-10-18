import type {
  CalendarActivityRecord,
  CalendarEventDraft,
  CalendarMealSource,
  ExternalTimingWriter,
  GoogleCalendarEvent,
} from "./types";
import { buildCalendarActivities, deterministicGoogleEventId, toGoogleEvent } from "./events";
import {
  GoogleCalendarApiError,
  GoogleCalendarClient,
  GoogleCalendarSyncTokenInvalidError,
} from "./google-client";

export interface CalendarSyncPersistence {
  getActivityByEvent(connectionId: number, eventId: string): Promise<CalendarActivityRecord | null>;
  getActivity(input: {
    connectionId: number;
    mealGroupId: number;
    kind: "cooking" | "defrost";
  }): Promise<CalendarActivityRecord | null>;
  upsertDesired(input: {
    connectionId: number;
    eventId: string;
    draft: CalendarEventDraft;
  }): Promise<CalendarActivityRecord>;
  saveSynced(input: {
    activityId: number;
    etag: string;
    startAt: string;
    endAt: string;
    mealRevision: number;
    explicitDurationMinutes?: number | null;
  }): Promise<void>;
  markRemoved(activityId: number): Promise<void>;
  markConflict(activityId: number, message: string): Promise<void>;
  deleteActivity(activityId: number): Promise<void>;
  completeCatchup(connectionId: number, syncToken: string): Promise<void>;
  clearSyncToken(connectionId: number): Promise<void>;
}

function eventTimes(event: GoogleCalendarEvent): {
  startAt: string;
  endAt: string;
  durationMinutes: number;
} | null {
  if (
    event.recurrence?.length ||
    event.start?.date ||
    event.end?.date ||
    !event.start?.dateTime ||
    !event.end?.dateTime
  ) {
    return null;
  }
  const start = new Date(event.start.dateTime);
  const end = new Date(event.end.dateTime);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || durationMinutes <= 0) {
    return null;
  }
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    durationMinutes,
  };
}

export async function reconcileIncomingCalendarEvent(input: {
  connectionId: number;
  event: GoogleCalendarEvent;
  persistence: CalendarSyncPersistence;
  timingWriter: ExternalTimingWriter;
}): Promise<"ignored" | "replayed" | "applied" | "conflict" | "removed"> {
  if (!input.event.id) return "ignored";
  const activity = await input.persistence.getActivityByEvent(
    input.connectionId,
    input.event.id
  );
  if (!activity) return "ignored";
  if (input.event.etag && input.event.etag === activity.googleEtag) return "replayed";

  if (input.event.status === "cancelled") {
    if (activity.state === "removed") return "replayed";
    await input.persistence.markRemoved(activity.id);
    await input.timingWriter.recordCalendarConflict({
      mealGroupId: activity.mealGroupId,
      kind: "calendar_deleted",
      message: "The managed calendar activity was deleted in Google Calendar.",
      details: { activityKind: activity.kind },
    });
    return "removed";
  }

  const times = eventTimes(input.event);
  if (!times) {
    await input.persistence.markConflict(activity.id, "Unsupported Google Calendar timing change");
    await input.timingWriter.recordCalendarConflict({
      mealGroupId: activity.mealGroupId,
      kind: "calendar_unsupported_change",
      message: "Recurring and all-day managed activities must be corrected in Mychelin.",
      details: { eventId: input.event.id },
    });
    return "conflict";
  }

  if (times.startAt === activity.startAt && times.endAt === activity.endAt) {
    await input.persistence.saveSynced({
      activityId: activity.id,
      etag: input.event.etag || activity.googleEtag || "",
      startAt: times.startAt,
      endAt: times.endAt,
      mealRevision: activity.sourceMealRevision,
      explicitDurationMinutes: activity.explicitDurationMinutes,
    });
    return "applied";
  }

  const result =
    activity.kind === "cooking"
      ? await input.timingWriter.applyCookingTiming({
          mealGroupId: activity.mealGroupId,
          expectedRevision: activity.sourceMealRevision,
          serveAt: times.endAt,
          durationOverrideMinutes: times.durationMinutes,
          source: "google",
        })
      : input.timingWriter.applyDefrostTiming
        ? await input.timingWriter.applyDefrostTiming({
            mealGroupId: activity.mealGroupId,
            expectedRevision: activity.sourceMealRevision,
            defrostAt: times.startAt,
            source: "google",
          })
        : { status: "version_conflict" as const };

  if (result.status !== "applied") {
    const message =
      result.status === "historical"
        ? "A completed meal cannot be rescheduled from Google Calendar."
        : "The meal changed in Mychelin while Google Calendar was being edited.";
    await input.persistence.markConflict(activity.id, message);
    await input.timingWriter.recordCalendarConflict({
      mealGroupId: activity.mealGroupId,
      kind:
        result.status === "historical"
          ? "calendar_unsupported_change"
          : "calendar_concurrent_edit",
      message,
      details: { eventId: input.event.id, expectedRevision: activity.sourceMealRevision },
    });
    return "conflict";
  }

  await input.persistence.saveSynced({
    activityId: activity.id,
    etag: input.event.etag || "",
    startAt: times.startAt,
    endAt: times.endAt,
    mealRevision: result.revision,
    explicitDurationMinutes: activity.kind === "cooking" ? times.durationMinutes : null,
  });
  return "applied";
}

export async function catchUpCalendarChanges(input: {
  connectionId: number;
  calendarId: string;
  accessToken: string;
  syncToken: string | null;
  client: GoogleCalendarClient;
  persistence: CalendarSyncPersistence;
  timingWriter: ExternalTimingWriter;
}): Promise<{ processed: number; reset: boolean }> {
  let changes: { events: GoogleCalendarEvent[]; nextSyncToken: string };
  let reset = false;
  try {
    changes = await input.client.listChangedEvents({
      accessToken: input.accessToken,
      calendarId: input.calendarId,
      syncToken: input.syncToken,
    });
  } catch (error) {
    if (!(error instanceof GoogleCalendarSyncTokenInvalidError) || !input.syncToken) {
      throw error;
    }
    await input.persistence.clearSyncToken(input.connectionId);
    reset = true;
    changes = await input.client.listChangedEvents({
      accessToken: input.accessToken,
      calendarId: input.calendarId,
      syncToken: null,
    });
  }
  for (const event of changes.events) {
    await reconcileIncomingCalendarEvent({
      connectionId: input.connectionId,
      event,
      persistence: input.persistence,
      timingWriter: input.timingWriter,
    });
  }
  // Persist only after every page/event has been processed successfully.
  await input.persistence.completeCatchup(input.connectionId, changes.nextSyncToken);
  return { processed: changes.events.length, reset };
}

function timingChanged(event: GoogleCalendarEvent, activity: CalendarActivityRecord): boolean {
  const times = eventTimes(event);
  return !times || times.startAt !== activity.startAt || times.endAt !== activity.endAt;
}

export async function syncCalendarActivity(input: {
  connectionId: number;
  calendarId: string;
  accessToken: string;
  mealGroupId: number;
  kind: "cooking" | "defrost";
  source: CalendarMealSource | null;
  appBaseUrl: string;
  defrostTime?: string;
  defrostAtOverride?: string | null;
  client: GoogleCalendarClient;
  persistence: CalendarSyncPersistence;
  timingWriter: ExternalTimingWriter;
}): Promise<"created" | "updated" | "deleted" | "absent" | "conflict"> {
  const existing = await input.persistence.getActivity({
    connectionId: input.connectionId,
    mealGroupId: input.mealGroupId,
    kind: input.kind,
  });
  const draft = input.source
    ? buildCalendarActivities(input.source, {
        appBaseUrl: input.appBaseUrl,
        defrostTime: input.defrostTime,
        defrostAtOverride: input.defrostAtOverride,
      }).find((item) => item.kind === input.kind)
    : undefined;

  if (!draft) {
    if (!existing?.googleEventId) return "absent";
    try {
      await input.client.deleteEvent({
        accessToken: input.accessToken,
        calendarId: input.calendarId,
        eventId: existing.googleEventId,
        etag: existing.googleEtag,
      });
      await input.persistence.deleteActivity(existing.id);
      return "deleted";
    } catch (error) {
      if (error instanceof GoogleCalendarApiError && error.status === 404) {
        await input.persistence.deleteActivity(existing.id);
        return "deleted";
      }
      if (error instanceof GoogleCalendarApiError && error.status === 412) {
        await input.persistence.markConflict(existing.id, "Google activity changed before deletion");
        return "conflict";
      }
      throw error;
    }
  }

  const eventId =
    existing?.googleEventId ||
    (await deterministicGoogleEventId({
      connectionId: input.connectionId,
      mealGroupId: input.mealGroupId,
      kind: input.kind,
    }));
  const activity = await input.persistence.upsertDesired({
    connectionId: input.connectionId,
    eventId,
    draft,
  });
  const eventBody = toGoogleEvent(draft, existing ? undefined : eventId);

  if (!existing?.googleEtag) {
    try {
      const created = await input.client.createEvent({
        accessToken: input.accessToken,
        calendarId: input.calendarId,
        event: eventBody,
      });
      await input.persistence.saveSynced({
        activityId: activity.id,
        etag: created.etag || "",
        startAt: draft.startAt,
        endAt: draft.endAt,
        mealRevision: draft.mealRevision,
      });
      return "created";
    } catch (error) {
      if (!(error instanceof GoogleCalendarApiError) || error.status !== 409) throw error;
      const current = await input.client.getEvent({
        accessToken: input.accessToken,
        calendarId: input.calendarId,
        eventId,
      });
      if (timingChanged(current, activity)) {
        await input.persistence.markConflict(activity.id, "Existing Google activity has different timing");
        return "conflict";
      }
      await input.persistence.saveSynced({
        activityId: activity.id,
        etag: current.etag || "",
        startAt: draft.startAt,
        endAt: draft.endAt,
        mealRevision: draft.mealRevision,
      });
      return "updated";
    }
  }

  try {
    const updated = await input.client.updateEvent({
      accessToken: input.accessToken,
      calendarId: input.calendarId,
      eventId,
      event: eventBody,
      etag: existing.googleEtag,
    });
    await input.persistence.saveSynced({
      activityId: activity.id,
      etag: updated.etag || "",
      startAt: draft.startAt,
      endAt: draft.endAt,
      mealRevision: draft.mealRevision,
    });
    return "updated";
  } catch (error) {
    if (!(error instanceof GoogleCalendarApiError) || error.status !== 412) throw error;
    const current = await input.client.getEvent({
      accessToken: input.accessToken,
      calendarId: input.calendarId,
      eventId,
    });
    if (timingChanged(current, existing)) {
      await input.persistence.markConflict(activity.id, "Google and Mychelin changed this activity concurrently");
      await input.timingWriter.recordCalendarConflict({
        mealGroupId: input.mealGroupId,
        kind: "calendar_concurrent_edit",
        message: "Google and Mychelin changed this meal time at the same time.",
        details: { eventId },
      });
      return "conflict";
    }
    const merged = await input.client.updateEvent({
      accessToken: input.accessToken,
      calendarId: input.calendarId,
      eventId,
      event: eventBody,
      etag: current.etag || "",
    });
    await input.persistence.saveSynced({
      activityId: activity.id,
      etag: merged.etag || "",
      startAt: draft.startAt,
      endAt: draft.endAt,
      mealRevision: draft.mealRevision,
    });
    return "updated";
  }
}
