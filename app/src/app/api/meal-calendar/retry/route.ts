import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { mealCalendarSetup } from "@/lib/meal-calendar/config";
import { resolveCalendarScope } from "@/lib/meal-calendar/scope";
import {
  enqueueCalendarJob,
  enqueueInitialCalendarSync,
  getCalendarConnectionForScope,
} from "@/lib/meal-calendar/store";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mealCalendarSetup().configured) {
    return NextResponse.json({ error: "Calendar sync is not configured" }, { status: 503 });
  }
  const resolved = await resolveCalendarScope(currentUser.id);
  const connection = await getCalendarConnectionForScope(resolved.scope);
  if (!connection) return NextResponse.json({ error: "Calendar is not connected" }, { status: 404 });
  await enqueueInitialCalendarSync({
    connectionId: connection.id,
    userId: connection.userId,
    householdId: connection.householdId,
  });
  if (
    connection.status === "paused" ||
    !connection.watchExpiresAt ||
    new Date(connection.watchExpiresAt).getTime() < Date.now() + 24 * 60 * 60_000
  ) {
    await enqueueCalendarJob({
      connectionId: connection.id,
      action: "renew_watch",
      dedupeKey: `renew-watch:${connection.id}`,
    });
  }
  return NextResponse.json({ success: true, queued: true });
}
