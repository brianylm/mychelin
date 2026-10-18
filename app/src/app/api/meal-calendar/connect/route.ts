import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMealCalendarConfig, mealCalendarSetup } from "@/lib/meal-calendar/config";
import {
  buildCalendarAuthorizationUrl,
  CALENDAR_OAUTH_STATE_COOKIE,
  CALENDAR_OAUTH_STATE_TTL_SECONDS,
  createCalendarOAuthState,
} from "@/lib/meal-calendar/oauth";
import { resolveCalendarScope } from "@/lib/meal-calendar/scope";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const setup = mealCalendarSetup();
  if (!setup.configured) {
    return NextResponse.json(
      { error: "Google Calendar sync is not configured", missing: setup.missing },
      { status: 503 }
    );
  }
  const resolved = await resolveCalendarScope(currentUser.id);
  if (!resolved.canManage) {
    return NextResponse.json(
      { error: "Only a household admin can connect the shared calendar" },
      { status: 403 }
    );
  }
  const config = getMealCalendarConfig();
  const state = await createCalendarOAuthState({
    userId: currentUser.id,
    scope: resolved.scope,
    returnTo: request.nextUrl.searchParams.get("returnTo"),
    encryptionKey: config.encryptionKey,
  });
  const response = NextResponse.redirect(
    buildCalendarAuthorizationUrl({ config, state: state.state })
  );
  response.cookies.set(CALENDAR_OAUTH_STATE_COOKIE, state.cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CALENDAR_OAUTH_STATE_TTL_SECONDS,
    path: "/api/meal-calendar",
  });
  return response;
}
