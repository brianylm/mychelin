import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { disconnectCalendar } from "@/lib/meal-calendar/connection-service";
import { getMealCalendarConfig, mealCalendarSetup } from "@/lib/meal-calendar/config";
import { publicCalendarError } from "@/lib/meal-calendar/api-errors";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mealCalendarSetup().configured) {
    return NextResponse.json({ error: "Calendar sync is not configured" }, { status: 503 });
  }
  try {
    await disconnectCalendar({ userId: currentUser.id, config: getMealCalendarConfig() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: publicCalendarError(error, "Google Calendar could not be disconnected. Try again.") },
      { status: 409 }
    );
  }
}
