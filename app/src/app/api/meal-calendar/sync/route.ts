import { NextRequest, NextResponse } from "next/server";
import { getMealCalendarConfig, mealCalendarSetup } from "@/lib/meal-calendar/config";
import { secureEqual } from "@/lib/meal-calendar/crypto";
import { runDueCalendarJobs } from "@/lib/meal-calendar/runner";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST(request: NextRequest) {
  if (!mealCalendarSetup().configured) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const config = getMealCalendarConfig();
  const authorization = request.headers.get("authorization") || "";
  const expected = `Bearer ${config.syncSecret}`;
  if (!secureEqual(authorization, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDueCalendarJobs({ config, limit: 20 });
  return NextResponse.json(result);
}
