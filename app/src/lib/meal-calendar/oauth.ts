import type { CalendarScope } from "./types";
import type { MealCalendarConfig } from "./config";
import {
  decryptCalendarSecret,
  encryptCalendarSecret,
  randomOpaqueToken,
  secureEqual,
} from "./crypto";

const STATE_CONTEXT = "mychelin:meal-calendar:oauth-state:v1";
export const CALENDAR_OAUTH_STATE_COOKIE = "mychelin_calendar_oauth_state";
export const CALENDAR_OAUTH_STATE_TTL_SECONDS = 10 * 60;

interface StatePayload {
  nonce: string;
  userId: number;
  scope: CalendarScope;
  returnTo: string;
  expiresAt: number;
}

function safeReturnTo(value: string | null | undefined): string {
  if (value?.startsWith("/app") && !value.startsWith("//")) return value;
  return "/app";
}

export async function createCalendarOAuthState(input: {
  userId: number;
  scope: CalendarScope;
  returnTo?: string | null;
  encryptionKey: string;
  now?: number;
}): Promise<{ state: string; cookieValue: string }> {
  const state = randomOpaqueToken();
  const payload: StatePayload = {
    nonce: state,
    userId: input.userId,
    scope: input.scope,
    returnTo: safeReturnTo(input.returnTo),
    expiresAt: (input.now ?? Date.now()) + CALENDAR_OAUTH_STATE_TTL_SECONDS * 1000,
  };
  const encrypted = await encryptCalendarSecret(
    JSON.stringify(payload),
    input.encryptionKey,
    STATE_CONTEXT
  );
  return { state, cookieValue: `${encrypted.iv}.${encrypted.ciphertext}` };
}

export async function consumeCalendarOAuthState(input: {
  state: string | null;
  cookieValue: string | undefined;
  encryptionKey: string;
  now?: number;
}): Promise<StatePayload> {
  if (!input.state || !input.cookieValue) throw new Error("Calendar OAuth state is missing");
  const [iv, ciphertext, extra] = input.cookieValue.split(".");
  if (!iv || !ciphertext || extra) throw new Error("Calendar OAuth state is invalid");
  const plaintext = await decryptCalendarSecret(
    { iv, ciphertext },
    input.encryptionKey,
    STATE_CONTEXT
  );
  const payload = JSON.parse(plaintext) as Partial<StatePayload>;
  if (
    typeof payload.nonce !== "string" ||
    !secureEqual(payload.nonce, input.state) ||
    typeof payload.userId !== "number" ||
    !payload.scope ||
    (payload.scope.type !== "solo" && payload.scope.type !== "household") ||
    typeof payload.scope.id !== "number" ||
    typeof payload.expiresAt !== "number" ||
    typeof payload.returnTo !== "string"
  ) {
    throw new Error("Calendar OAuth state is invalid");
  }
  if (payload.expiresAt < (input.now ?? Date.now())) {
    throw new Error("Calendar OAuth state has expired");
  }
  return payload as StatePayload;
}

export function buildCalendarAuthorizationUrl(input: {
  config: MealCalendarConfig;
  state: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", input.config.scopes.join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent select_account");
  return url.toString();
}

export function validateGrantedScopes(value: string | undefined): void {
  const scopes = new Set((value || "").split(/\s+/).filter(Boolean));
  const missing = [
    "https://www.googleapis.com/auth/calendar.app.created",
    "https://www.googleapis.com/auth/calendar.acls",
  ].filter((scope) => !scopes.has(scope));
  if (missing.length) {
    throw new Error("Google did not grant the required Mychelin Calendar access");
  }
}
