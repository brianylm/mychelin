import type { GoogleCalendarEvent } from "./types";

const API_ROOT = "https://www.googleapis.com/calendar/v3";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export class GoogleCalendarApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "GoogleCalendarApiError";
  }
}

export class GoogleCalendarTokenInvalidError extends GoogleCalendarApiError {
  constructor() {
    super("Google Calendar authorization is no longer valid", 401, "invalid_grant");
    this.name = "GoogleCalendarTokenInvalidError";
  }
}

export class GoogleCalendarSyncTokenInvalidError extends GoogleCalendarApiError {
  constructor() {
    super("Google Calendar sync token is no longer valid", 410, "sync_token_invalid");
    this.name = "GoogleCalendarSyncTokenInvalidError";
  }
}

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  scope: string;
}

interface JsonErrorBody {
  error?: string | { code?: number; message?: string; status?: string };
  error_description?: string;
}

async function parseError(response: Response): Promise<GoogleCalendarApiError> {
  const body = (await response.json().catch(() => ({}))) as JsonErrorBody;
  const structured = typeof body.error === "object" ? body.error : undefined;
  const code = typeof body.error === "string" ? body.error : structured?.status;
  const message =
    body.error_description || structured?.message || `Google Calendar request failed (${response.status})`;
  if (response.status === 410) return new GoogleCalendarSyncTokenInvalidError();
  if (code === "invalid_grant") return new GoogleCalendarTokenInvalidError();
  return new GoogleCalendarApiError(message, response.status, code);
}

async function jsonRequest<T>(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit
): Promise<T> {
  const response = await fetcher(url, init);
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function authHeaders(accessToken: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

export class GoogleCalendarClient {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async exchangeCode(input: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<GoogleTokenSet> {
    const body = await jsonRequest<{
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    }>(this.fetcher, TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!body.access_token || !body.refresh_token) {
      throw new GoogleCalendarApiError(
        "Google did not return offline Calendar credentials",
        400,
        "missing_refresh_token"
      );
    }
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: new Date(Date.now() + (body.expires_in || 3600) * 1000).toISOString(),
      scope: body.scope || "",
    };
  }

  async refreshAccessToken(input: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<GoogleTokenSet> {
    const body = await jsonRequest<{
      access_token?: string;
      expires_in?: number;
      scope?: string;
    }>(this.fetcher, TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: input.refreshToken,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        grant_type: "refresh_token",
      }),
    });
    if (!body.access_token) {
      throw new GoogleCalendarTokenInvalidError();
    }
    return {
      accessToken: body.access_token,
      refreshToken: null,
      expiresAt: new Date(Date.now() + (body.expires_in || 3600) * 1000).toISOString(),
      scope: body.scope || "",
    };
  }

  getProfile(accessToken: string): Promise<{ email: string; email_verified?: boolean }> {
    return jsonRequest(this.fetcher, USERINFO_ENDPOINT, {
      headers: authHeaders(accessToken),
    });
  }

  createCalendar(input: {
    accessToken: string;
    summary: string;
    timezone: string;
  }): Promise<{ id: string; summary?: string; timeZone?: string }> {
    return jsonRequest(this.fetcher, `${API_ROOT}/calendars`, {
      method: "POST",
      headers: authHeaders(input.accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ summary: input.summary, timeZone: input.timezone }),
    });
  }

  createEvent(input: {
    accessToken: string;
    calendarId: string;
    event: GoogleCalendarEvent;
  }): Promise<GoogleCalendarEvent> {
    return jsonRequest(
      this.fetcher,
      `${API_ROOT}/calendars/${encodeURIComponent(input.calendarId)}/events`,
      {
        method: "POST",
        headers: authHeaders(input.accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify(input.event),
      }
    );
  }

  updateEvent(input: {
    accessToken: string;
    calendarId: string;
    eventId: string;
    event: Partial<GoogleCalendarEvent>;
    etag: string;
  }): Promise<GoogleCalendarEvent> {
    return jsonRequest(
      this.fetcher,
      `${API_ROOT}/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      {
        method: "PATCH",
        headers: authHeaders(input.accessToken, {
          "Content-Type": "application/json",
          "If-Match": input.etag,
        }),
        body: JSON.stringify(input.event),
      }
    );
  }

  getEvent(input: {
    accessToken: string;
    calendarId: string;
    eventId: string;
  }): Promise<GoogleCalendarEvent> {
    return jsonRequest(
      this.fetcher,
      `${API_ROOT}/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      { headers: authHeaders(input.accessToken) }
    );
  }

  deleteEvent(input: {
    accessToken: string;
    calendarId: string;
    eventId: string;
    etag?: string | null;
  }): Promise<void> {
    return jsonRequest(
      this.fetcher,
      `${API_ROOT}/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      {
        method: "DELETE",
        headers: authHeaders(
          input.accessToken,
          input.etag ? { "If-Match": input.etag } : undefined
        ),
      }
    );
  }

  async listChangedEvents(input: {
    accessToken: string;
    calendarId: string;
    syncToken?: string | null;
  }): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken: string }> {
    const events: GoogleCalendarEvent[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;
    do {
      const url = new URL(
        `${API_ROOT}/calendars/${encodeURIComponent(input.calendarId)}/events`
      );
      url.searchParams.set("showDeleted", "true");
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("maxResults", "2500");
      if (input.syncToken) url.searchParams.set("syncToken", input.syncToken);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const page = await jsonRequest<{
        items?: GoogleCalendarEvent[];
        nextPageToken?: string;
        nextSyncToken?: string;
      }>(this.fetcher, url.toString(), { headers: authHeaders(input.accessToken) });
      events.push(...(page.items || []));
      pageToken = page.nextPageToken;
      nextSyncToken = page.nextSyncToken || nextSyncToken;
    } while (pageToken);
    if (!nextSyncToken) {
      throw new GoogleCalendarApiError("Google Calendar sync did not return a sync token", 502);
    }
    return { events, nextSyncToken };
  }

  watchEvents(input: {
    accessToken: string;
    calendarId: string;
    channelId: string;
    channelToken: string;
    webhookUrl: string;
    ttlSeconds?: number;
  }): Promise<{ id: string; resourceId: string; expiration?: string }> {
    return jsonRequest(
      this.fetcher,
      `${API_ROOT}/calendars/${encodeURIComponent(input.calendarId)}/events/watch`,
      {
        method: "POST",
        headers: authHeaders(input.accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: input.channelId,
          type: "web_hook",
          address: input.webhookUrl,
          token: input.channelToken,
          params: { ttl: String(input.ttlSeconds || 604800) },
        }),
      }
    );
  }

  stopChannel(input: {
    accessToken: string;
    channelId: string;
    resourceId: string;
  }): Promise<void> {
    return jsonRequest(this.fetcher, `${API_ROOT}/channels/stop`, {
      method: "POST",
      headers: authHeaders(input.accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ id: input.channelId, resourceId: input.resourceId }),
    });
  }

  shareCalendar(input: {
    accessToken: string;
    calendarId: string;
    email: string;
  }): Promise<{ id: string }> {
    return jsonRequest(
      this.fetcher,
      `${API_ROOT}/calendars/${encodeURIComponent(input.calendarId)}/acl?sendNotifications=true`,
      {
        method: "POST",
        headers: authHeaders(input.accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({ role: "writer", scope: { type: "user", value: input.email } }),
      }
    );
  }

  getCalendarShare(input: {
    accessToken: string;
    calendarId: string;
    ruleId: string;
  }): Promise<{ id: string; role?: string; scope?: { type?: string; value?: string } }> {
    return jsonRequest(
      this.fetcher,
      `${API_ROOT}/calendars/${encodeURIComponent(input.calendarId)}/acl/${encodeURIComponent(input.ruleId)}`,
      { headers: authHeaders(input.accessToken) }
    );
  }

  revokeCalendarShare(input: {
    accessToken: string;
    calendarId: string;
    ruleId: string;
  }): Promise<void> {
    return jsonRequest(
      this.fetcher,
      `${API_ROOT}/calendars/${encodeURIComponent(input.calendarId)}/acl/${encodeURIComponent(input.ruleId)}`,
      { method: "DELETE", headers: authHeaders(input.accessToken) }
    );
  }
}
