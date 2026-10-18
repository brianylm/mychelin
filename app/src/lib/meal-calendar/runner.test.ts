import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCalendarConnectionById: vi.fn(),
  isHouseholdMember: vi.fn(),
  setCalendarConnectionState: vi.fn(),
  teardownCalendarConnection: vi.fn(),
  revokeQueuedCalendarShare: vi.fn(),
  getCalendarAccessToken: vi.fn(),
}));

vi.mock("./store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./store")>()),
  getCalendarConnectionById: mocks.getCalendarConnectionById,
  setCalendarConnectionState: mocks.setCalendarConnectionState,
}));
vi.mock("@/lib/households", () => ({ isHouseholdMember: mocks.isHouseholdMember }));
vi.mock("./connection-service", () => ({
  teardownCalendarConnection: mocks.teardownCalendarConnection,
  revokeQueuedCalendarShare: mocks.revokeQueuedCalendarShare,
}));
vi.mock("./token-service", () => ({ getCalendarAccessToken: mocks.getCalendarAccessToken }));

import { GoogleCalendarApiError, type GoogleCalendarClient } from "./google-client";
import { processCalendarJob } from "./runner";
import { deletedEventIdFromJob, type ClaimedCalendarJob } from "./store";
import type { MealCalendarConfig } from "./config";

const config = {} as MealCalendarConfig;

function job(overrides: Partial<ClaimedCalendarJob>): ClaimedCalendarJob {
  return {
    id: 1,
    connectionId: 7,
    mealGroupId: null,
    shareId: null,
    kind: null,
    action: "sync_activity",
    dedupeKey: "k",
    status: "leased",
    attempts: 0,
    notBefore: "2026-10-17T00:00:00.000Z",
    leasedAt: null,
    leaseToken: "lease",
    lastError: null,
    createdAt: "2026-10-17T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
    ...overrides,
  };
}

// A paused household connection whose owner has already left: the state in
// which removal work must still run.
const departedOwnerConnection = {
  id: 7,
  userId: 1,
  householdId: 10,
  calendarId: "cal",
  status: "paused",
  disconnectedAt: null,
};

describe("calendar removal jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCalendarConnectionById.mockResolvedValue(departedOwnerConnection);
    mocks.isHouseholdMember.mockResolvedValue(false);
    mocks.getCalendarAccessToken.mockResolvedValue("token");
  });

  it("tears down a paused connection even after the owner left", async () => {
    await processCalendarJob({ job: job({ action: "teardown_connection" }), config });
    expect(mocks.teardownCalendarConnection).toHaveBeenCalledWith(
      expect.objectContaining({ connection: departedOwnerConnection })
    );
    expect(mocks.setCalendarConnectionState).not.toHaveBeenCalled();
  });

  it("revokes the queued share for an unshare job", async () => {
    await processCalendarJob({ job: job({ action: "unshare", shareId: 3 }), config });
    expect(mocks.revokeQueuedCalendarShare).toHaveBeenCalledWith(
      expect.objectContaining({ shareId: 3 })
    );
  });

  it("deletes the Google event of a deleted meal and treats a missing event as done", async () => {
    const deleteEvent = vi
      .fn()
      .mockRejectedValueOnce(new GoogleCalendarApiError("gone", 410));
    const client = { deleteEvent } as unknown as GoogleCalendarClient;
    await processCalendarJob({
      job: job({ action: "delete_event", dedupeKey: "delete_event:7:abc123v" }),
      config,
      client,
    });
    expect(deleteEvent).toHaveBeenCalledWith({
      accessToken: "token",
      calendarId: "cal",
      eventId: "abc123v",
    });
  });

  it("retries a delete that failed for another reason", async () => {
    const deleteEvent = vi.fn().mockRejectedValue(new GoogleCalendarApiError("busy", 503));
    const client = { deleteEvent } as unknown as GoogleCalendarClient;
    await expect(
      processCalendarJob({
        job: job({ action: "delete_event", dedupeKey: "delete_event:7:abc123v" }),
        config,
        client,
      })
    ).rejects.toThrow("busy");
  });

  it("only reads event ids from delete jobs", () => {
    expect(deletedEventIdFromJob({ action: "delete_event", dedupeKey: "delete_event:7:e1" })).toBe("e1");
    expect(deletedEventIdFromJob({ action: "sync_activity", dedupeKey: "meal:7:1:cooking" })).toBeNull();
    expect(deletedEventIdFromJob({ action: "delete_event", dedupeKey: "delete_event:7" })).toBeNull();
  });
});
