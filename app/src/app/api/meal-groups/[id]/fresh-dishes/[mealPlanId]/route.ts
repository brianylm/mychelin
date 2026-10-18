import { NextRequest, NextResponse } from "next/server";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import {
  MealPilotError,
  removeFreshDish,
  updateFreshDish,
} from "@/lib/meal-pilot/service";
import { mealPilotErrorResponse, numericRouteId } from "@/lib/meal-pilot/http";
import type { UpdateFreshDishRequest } from "@/lib/meal-pilot/types";
import { requestMealCalendarSync } from "@/lib/meal-calendar/store";

export const runtime = "edge";
export const preferredRegion = "hnd1";
type RouteContext = { params: Promise<{ id: string; mealPlanId: string }> };

function ids(params: { id: string; mealPlanId: string }) {
  const mealGroupId = numericRouteId(params.id);
  const mealPlanId = numericRouteId(params.mealPlanId);
  if (mealGroupId == null || mealPlanId == null) {
    throw new MealPilotError("Fresh dish not found", 404, "NOT_FOUND");
  }
  return { mealGroupId, mealPlanId };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const routeIds = ids(await context.params);
    const body = (await request.json()) as UpdateFreshDishRequest;
    const mealGroup = await updateFreshDish(user.id, routeIds.mealGroupId, routeIds.mealPlanId, body);
    await requestMealCalendarSync(mealGroup.id, mealGroup.revision);
    return NextResponse.json({ mealGroup });
  } catch (error) {
    return mealPilotErrorResponse(error, "PATCH /api/meal-groups/[id]/fresh-dishes/[mealPlanId]");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const routeIds = ids(await context.params);
    const expectedRevision = Number(request.nextUrl.searchParams.get("expectedRevision"));
    const mealGroup = await removeFreshDish(
        user.id,
        routeIds.mealGroupId,
        routeIds.mealPlanId,
        expectedRevision
      );
    await requestMealCalendarSync(mealGroup.id, mealGroup.revision);
    return NextResponse.json({ mealGroup });
  } catch (error) {
    return mealPilotErrorResponse(error, "DELETE /api/meal-groups/[id]/fresh-dishes/[mealPlanId]");
  }
}
