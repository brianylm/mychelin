import type { MealDishView, MealGroupView } from "@/lib/meal-pilot/types";

export const GOOGLE_CALENDAR_APP_SCOPE =
  "https://www.googleapis.com/auth/calendar.app.created" as const;
export const GOOGLE_CALENDAR_ACL_SCOPE =
  "https://www.googleapis.com/auth/calendar.acls" as const;
export const GOOGLE_IDENTITY_SCOPES = ["openid", "email"] as const;
export const REQUIRED_GOOGLE_SCOPES = [
  ...GOOGLE_IDENTITY_SCOPES,
  GOOGLE_CALENDAR_APP_SCOPE,
  GOOGLE_CALENDAR_ACL_SCOPE,
] as const;

export type CalendarScope =
  | { type: "solo"; id: number }
  | { type: "household"; id: number };

export type CalendarConnectionState =
  | "active"
  | "paused"
  | "needs_reauth"
  | "disconnected";

export type CalendarShareState =
  | "pending"
  | "active"
  | "revocation_pending"
  | "revoked"
  | "failed";
export type CalendarActivityKind = "cooking" | "defrost";

export interface CalendarStatusResponse {
  configured: boolean;
  scope: CalendarScope;
  canManage: boolean;
  connection: null | {
    status: CalendarConnectionState;
    googleAccountEmail: string;
    calendarId: string | null;
    calendarTimezone: string;
    lastSyncedAt: string | null;
    lastError: string | null;
    watchExpiresAt: string | null;
    shares?: Array<{
      userId: number;
      email: string;
      status: CalendarShareState;
    }>;
  };
  setup?: { missing: string[] };
}

export interface CalendarMealSource {
  mealGroup: Pick<
    MealGroupView,
    | "id"
    | "revision"
    | "date"
    | "mealType"
    | "serveAt"
    | "timezone"
    | "dinerCount"
    | "durationOverrideMinutes"
    | "defrostAtOverride"
    | "status"
    | "confirmedAt"
  >;
  dishes: MealDishView[];
}

export interface CalendarEventDraft {
  kind: CalendarActivityKind;
  mealGroupId: number;
  mealRevision: number;
  summary: string;
  description: string;
  startAt: string;
  endAt: string;
  timezone: string;
  extendedProperties: Record<string, string>;
}

export interface GoogleCalendarEvent {
  id?: string;
  etag?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  recurrence?: string[];
  updated?: string;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

export interface CalendarActivityRecord {
  id: number;
  connectionId: number;
  mealGroupId: number;
  kind: CalendarActivityKind;
  googleEventId: string | null;
  googleEtag: string | null;
  startAt: string | null;
  endAt: string | null;
  state: "pending" | "synced" | "removed" | "conflict" | "failed";
  desiredRevision: number;
  syncedRevision: number;
  sourceMealRevision: number;
  explicitDurationMinutes: number | null;
}

export type ExternalTimingResult =
  | { status: "applied"; revision: number }
  | { status: "version_conflict" | "historical" | "not_found" };

export interface ExternalTimingWriter {
  applyCookingTiming(input: {
    mealGroupId: number;
    expectedRevision: number;
    serveAt: string;
    durationOverrideMinutes: number;
    source: "google";
  }): Promise<ExternalTimingResult>;
  applyDefrostTiming?(input: {
    mealGroupId: number;
    expectedRevision: number;
    defrostAt: string;
    source: "google";
  }): Promise<ExternalTimingResult>;
  recordCalendarConflict(input: {
    mealGroupId: number;
    kind: "calendar_deleted" | "calendar_concurrent_edit" | "calendar_unsupported_change";
    message: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}
