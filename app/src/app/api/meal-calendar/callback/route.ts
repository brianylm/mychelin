import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { completeCalendarConnection } from "@/lib/meal-calendar/connection-service";
import { getMealCalendarConfig, mealCalendarSetup } from "@/lib/meal-calendar/config";
import {
  CALENDAR_OAUTH_STATE_COOKIE,
  consumeCalendarOAuthState,
} from "@/lib/meal-calendar/oauth";
import { resolveCalendarScope } from "@/lib/meal-calendar/scope";

export const runtime = "edge";
export const preferredRegion = "hnd1";

function destination(request: NextRequest, path: string, state: string): NextResponse {
  const url = new URL(path, request.url);
  url.searchParams.set("calendar", state);
  const response = NextResponse.redirect(url);
  response.cookies.set(CALENDAR_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/meal-calendar",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const setup = mealCalendarSetup();
  if (!setup.configured) return destination(request, "/app", "not_configured");
  const currentUser = await getCurrentUser();
  if (!currentUser) return destination(request, "/login", "login_required");
  if (request.nextUrl.searchParams.get("error")) {
    return destination(request, "/app", "cancelled");
  }
  const code = request.nextUrl.searchParams.get("code");
  const config = getMealCalendarConfig();
  try {
    if (!code) throw new Error("Missing Google authorization code");
    const state = await consumeCalendarOAuthState({
      state: request.nextUrl.searchParams.get("state"),
      cookieValue: request.cookies.get(CALENDAR_OAUTH_STATE_COOKIE)?.value,
      encryptionKey: config.encryptionKey,
    });
    const resolved = await resolveCalendarScope(currentUser.id);
    if (
      state.userId !== currentUser.id ||
      state.scope.type !== resolved.scope.type ||
      state.scope.id !== resolved.scope.id
    ) {
      throw new Error("Calendar authorization scope changed");
    }
    await completeCalendarConnection({ userId: currentUser.id, code, config });
    return destination(request, state.returnTo, "connected");
  } catch {
    return destination(request, "/app", "connect_failed");
  }
}
