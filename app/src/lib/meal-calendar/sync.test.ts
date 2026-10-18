import { describe, expect, it, vi } from "vitest";
import type {
  CalendarActivityRecord,
  ExternalTimingWriter,
  GoogleCalendarEvent,
} from "./types";
import type { CalendarSyncPersistence } from "./sync";
import {
  catchUpCalendarChanges,
  reconcileIncomingCalendarEvent,
} from "./sync";
import {
  GoogleCalendarClient,
  GoogleCalendarSyncTokenInvalidError,
} from "./google-client";

function activity(): CalendarActivityRecord {
  return {
    id: 1,
    connectionId: 2,
    mealGroupId: 3,
    kind: "cooking",
    googleEventId: "c0abcde",
    googleEtag: '"old"',
    startAt: "2026-10-20T10:00:00.000Z",
    endAt: "2026-10-20T11:00:00.000Z",
    state: "synced",
    desiredRevision: 4,
    syncedRevision: 4,
    sourceMealRevision: 4,
    explicitDurationMinutes: null,
  };
}

function persistence(record = activity()): CalendarSyncPersistence & {
  saved: Array<Record<string, unknown>>;
  conflicts: string[];
  cleared: number;
  tokens: string[];
} {
  const state = {
    saved: [] as Array<Record<string, unknown>>,
    conflicts: [] as string[],
    cleared: 0,
    tokens: [] as string[],
  };
  return {
    ...state,
    getActivityByEvent: async (_connectionId, eventId) =>
      eventId === record.googleEventId ? record : null,
    getActivity: async () => record,
    upsertDesired: async () => record,
    saveSynced: async (input) => void state.saved.push(input),
    markRemoved: async () => undefined,
    markConflict: async (_id, message) => void state.conflicts.push(message),
    deleteActivity: async () => undefined,
    completeCatchup: async (_connectionId, token) => void state.tokens.push(token),
    clearSyncToken: async () => void (state.cleared += 1),
    get saved() { return state.saved; },
    get conflicts() { return state.conflicts; },
    get cleared() { return state.cleared; },
    get tokens() { return state.tokens; },
  };
}

function writer(result: "applied" | "version_conflict" = "applied") {
  const cooking = vi.fn(async () =>
    result === "applied"
      ? ({ status: "applied", revision: 5 } as const)
      : ({ status: "version_conflict" } as const)
  );
  const conflict = vi.fn(async () => undefined);
  const value: ExternalTimingWriter = {
    applyCookingTiming: cooking,
    recordCalendarConflict: conflict,
  };
  return { value, cooking, conflict };
}

function movedEvent(etag = '"new"'): GoogleCalendarEvent {
  return {
    id: "c0abcde",
    etag,
    start: { dateTime: "2026-10-21T11:00:00.000Z" },
    end: { dateTime: "2026-10-21T12:30:00.000Z" },
  };
}

describe("incoming Calendar reconciliation", () => {
  it("replays an acknowledged event without applying meal timing twice", async () => {
    const store = persistence();
    const timing = writer();
    await expect(
      reconcileIncomingCalendarEvent({
        connectionId: 2,
        event: movedEvent('"old"'),
        persistence: store,
        timingWriter: timing.value,
      })
    ).resolves.toBe("replayed");
    expect(timing.cooking).not.toHaveBeenCalled();
  });

  it("uses event end as serve time and persists the resized duration", async () => {
    const store = persistence();
    const timing = writer();
    await expect(
      reconcileIncomingCalendarEvent({
        connectionId: 2,
        event: movedEvent(),
        persistence: store,
        timingWriter: timing.value,
      })
    ).resolves.toBe("applied");
    expect(timing.cooking).toHaveBeenCalledWith({
      mealGroupId: 3,
      expectedRevision: 4,
      serveAt: "2026-10-21T12:30:00.000Z",
      durationOverrideMinutes: 90,
      source: "google",
    });
    expect(store.saved[0]).toMatchObject({ mealRevision: 5, explicitDurationMinutes: 90 });
  });

  it("records a revision conflict instead of overwriting a Mychelin edit", async () => {
    const store = persistence();
    const timing = writer("version_conflict");
    await expect(
      reconcileIncomingCalendarEvent({
        connectionId: 2,
        event: movedEvent(),
        persistence: store,
        timingWriter: timing.value,
      })
    ).resolves.toBe("conflict");
    expect(store.conflicts[0]).toContain("changed in Mychelin");
    expect(timing.conflict).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "calendar_concurrent_edit" })
    );
  });

  it("clears a 410 sync token, performs a full catchup, and saves only the final token", async () => {
    const store = persistence();
    const timing = writer();
    const listChangedEvents = vi
      .fn()
      .mockRejectedValueOnce(new GoogleCalendarSyncTokenInvalidError())
      .mockResolvedValueOnce({ events: [], nextSyncToken: "fresh-token" });
    const client = { listChangedEvents } as unknown as GoogleCalendarClient;
    await expect(
      catchUpCalendarChanges({
        connectionId: 2,
        calendarId: "calendar",
        accessToken: "access",
        syncToken: "stale-token",
        client,
        persistence: store,
        timingWriter: timing.value,
      })
    ).resolves.toEqual({ processed: 0, reset: true });
    expect(store.cleared).toBe(1);
    expect(store.tokens).toEqual(["fresh-token"]);
    expect(listChangedEvents).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ syncToken: null })
    );
  });
});
