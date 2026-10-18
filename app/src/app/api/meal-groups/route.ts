import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import { createMealGroup, listMealGroups } from "@/lib/meal-pilot/service";
import { mealPilotErrorResponse } from "@/lib/meal-pilot/http";
import type { CreateMealGroupRequest } from "@/lib/meal-pilot/types";
import { requestMealCalendarSync } from "@/lib/meal-calendar/store";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const result = await listMealGroups({
      userId: user.id,
      startDate: request.nextUrl.searchParams.get("startDate"),
      endDate: request.nextUrl.searchParams.get("endDate"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return mealPilotErrorResponse(error, "GET /api/meal-groups");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const body = (await request.json()) as CreateMealGroupRequest;
    const mealGroup = await createMealGroup(user.id, body);
    await requestMealCalendarSync(mealGroup.id, mealGroup.revision);
    return NextResponse.json({ mealGroup }, { status: 201 });
  } catch (error) {
    return mealPilotErrorResponse(error, "POST /api/meal-groups");
  }
}
