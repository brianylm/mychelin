"use client";

import type { ReactNode } from "react";

import { Alert, Button } from "@/components/ui";
import type { CalendarStatusResponse } from "@/lib/meal-calendar/types";

export interface MealCalendarStatusProps {
  status: CalendarStatusResponse | null;
  loading?: boolean;
  busy?: boolean;
  error?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onShare: () => void;
  onRefresh: () => void;
}

const SYNC_LOCALE = "en-SG";
const MAX_ERROR_LENGTH = 180;
const BUTTON_CLASS = "h-11 min-w-0";

function sanitizeErrorText(message: string): string | null {
  const cleaned = message
    .replace(/https?:\/\/\S+/gi, "an external link")
    .replace(
      /\b(access_token|refresh_token|id_token|client_secret|api_key|code)=[^\s&]+/gi,
      "$1=[hidden]",
    )
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  return cleaned.length > MAX_ERROR_LENGTH
    ? `${cleaned.slice(0, MAX_ERROR_LENGTH - 1).trimEnd()}…`
    : cleaned;
}

function formatSyncedAt(value: string, timezone: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(SYNC_LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

export function MealCalendarStatus({
  status,
  loading = false,
  busy = false,
  error = null,
  onConnect,
  onDisconnect,
  onShare,
  onRefresh,
}: MealCalendarStatusProps) {
  const connection = status?.connection ?? null;
  const canManage = status?.canManage ?? false;
  const connectionAlert = connection?.lastError
    ? sanitizeErrorText(connection.lastError)
    : null;
  const lastSyncedAt = connection?.lastSyncedAt
    ? formatSyncedAt(connection.lastSyncedAt, connection.calendarTimezone)
    : null;

  let body: ReactNode;

  if (loading) {
    body = (
      <p className="text-sm text-ui-muted" role="status">
        Checking shared calendar…
      </p>
    );
  } else if (error) {
    body = (
      <div className="space-y-2">
        <Alert tone="danger" title="Couldn't update the shared calendar">
          <p className="min-w-0 break-words">{sanitizeErrorText(error) || "Please try again."}</p>
        </Alert>
        <Button
          className={BUTTON_CLASS}
          variant="secondary"
          onClick={onRefresh}
          disabled={busy}
        >
          Retry
        </Button>
      </div>
    );
  } else if (!status) {
    body = <p className="text-sm text-ui-muted" role="status">Checking shared calendar…</p>;
  } else if (!status.configured) {
    body = (
      <div className="space-y-1">
        <p className="text-sm text-ui-text">Calendar connection needs setup.</p>
        <p className="text-sm text-ui-muted">Your meal plan is still available.</p>
      </div>
    );
  } else if (!connection || connection.status === "disconnected") {
    body = canManage ? (
      <Button className={BUTTON_CLASS} onClick={onConnect} disabled={busy}>
        Connect Google Calendar
      </Button>
    ) : (
      <p className="text-sm text-ui-muted">
        Ask a household admin to connect the shared calendar.
      </p>
    );
  } else if (connection.status === "active") {
    body = (
      <div className="space-y-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-ui-text">Connected</p>
          <p className="min-w-0 break-words text-sm text-ui-text">
            {connection.googleAccountEmail}
          </p>
          {lastSyncedAt ? (
            <p className="text-sm text-ui-muted">Last synced {lastSyncedAt}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className={BUTTON_CLASS}
            variant="secondary"
            onClick={onShare}
            disabled={busy}
          >
            Add calendar to my view
          </Button>
          {canManage ? (
            <Button
              className={BUTTON_CLASS}
              variant="danger"
              onClick={onDisconnect}
              disabled={busy}
            >
              Disconnect
            </Button>
          ) : null}
        </div>
      </div>
    );
  } else {
    const isPaused = connection.status === "paused";

    body = (
      <div className="space-y-2">
        <Alert tone="warning" title="Connection needs attention">
          <p>
            {isPaused
              ? "Sharing to the shared calendar is paused, so plans are not being updated."
              : "Google Calendar access has expired and needs to be reconnected."}
          </p>
          {connectionAlert ? (
            <p className="mt-1 min-w-0 break-words">{connectionAlert}</p>
          ) : null}
        </Alert>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button className={BUTTON_CLASS} onClick={onConnect} disabled={busy}>
              Reconnect
            </Button>
            <Button
              className={BUTTON_CLASS}
              variant="danger"
              onClick={onDisconnect}
              disabled={busy}
            >
              Disconnect
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-ui-text">
        Shared Mychelin calendar
      </h3>
      {body}
    </section>
  );
}
