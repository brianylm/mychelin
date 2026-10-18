import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { mealCalendarSetup } from "@/lib/meal-calendar/config";
import { resolveCalendarScope } from "@/lib/meal-calendar/scope";
import {
  getCalendarConnectionForScope,
  listCalendarShares,
} from "@/lib/meal-calendar/store";
import type { CalendarStatusResponse } from "@/lib/meal-calendar/types";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resolved = await resolveCalendarScope(currentUser.id);
  const setup = mealCalendarSetup();
  if (!setup.configured) {
    const response: CalendarStatusResponse = {
      configured: false,
      scope: resolved.scope,
      canManage: resolved.canManage,
      connection: null,
      setup: { missing: setup.enabled ? setup.missing : ["MEAL_CALENDAR_ENABLED"] },
    };
    return NextResponse.json(response);
  }

  const connection = await getCalendarConnectionForScope(resolved.scope);
  if (!connection) {
    const response: CalendarStatusResponse = {
      configured: true,
      scope: resolved.scope,
      canManage: resolved.canManage,
      connection: null,
    };
    return NextResponse.json(response);
  }
  const allShares = await listCalendarShares(connection.id);
  const visibleShares = resolved.canManage
    ? allShares
    : allShares.filter((share) => share.userId === currentUser.id);
  const response: CalendarStatusResponse = {
    configured: true,
    scope: resolved.scope,
    canManage: resolved.canManage,
    connection: {
      status:
        connection.status === "connected"
          ? "active"
          : connection.status === "needs_reauth"
            ? "needs_reauth"
            : connection.status === "disconnected"
              ? "disconnected"
              : "paused",
      googleAccountEmail: connection.googleAccountEmail,
      calendarId: connection.calendarId,
      calendarTimezone: connection.calendarTimezone,
      lastSyncedAt: connection.lastSyncedAt,
      lastError: connection.lastError,
      watchExpiresAt: connection.watchExpiresAt,
      shares: visibleShares.map((share) => ({
        userId: share.userId,
        email: share.email,
        status: share.status as
          | "pending"
          | "active"
          | "revocation_pending"
          | "revoked"
          | "failed",
      })),
    },
  };
  return NextResponse.json(response);
}
