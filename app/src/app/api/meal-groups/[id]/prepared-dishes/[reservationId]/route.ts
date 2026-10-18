import { NextRequest, NextResponse } from "next/server";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import {
  MealPilotError,
  removePreparedDish,
  updatePreparedDish,
} from "@/lib/meal-pilot/service";
import { mealPilotErrorResponse, numericRouteId } from "@/lib/meal-pilot/http";
import type { UpdatePreparedDishRequest } from "@/lib/meal-pilot/types";
import { requestMealCalendarSync } from "@/lib/meal-calendar/store";

export const runtime = "edge";
export const preferredRegion = "hnd1";
type RouteContext = { params: Promise<{ id: string; reservationId: string }> };

function ids(params: { id: string; reservationId: string }) {
  const mealGroupId = numericRouteId(params.id);
  const reservationId = numericRouteId(params.reservationId);
  if (mealGroupId == null || reservationId == null) {
    throw new MealPilotError("Prepared dish not found", 404, "NOT_FOUND");
  }
  return { mealGroupId, reservationId };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const routeIds = ids(await context.params);
    const body = (await request.json()) as UpdatePreparedDishRequest;
    const mealGroup = await updatePreparedDish(
        user.id,
        routeIds.mealGroupId,
        routeIds.reservationId,
        body
      );
    await requestMealCalendarSync(mealGroup.id, mealGroup.revision);
    return NextResponse.json({ mealGroup });
  } catch (error) {
    return mealPilotErrorResponse(error, "PATCH /api/meal-groups/[id]/prepared-dishes/[reservationId]");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const routeIds = ids(await context.params);
    const expectedRevision = Number(request.nextUrl.searchParams.get("expectedRevision"));
    const mealGroup = await removePreparedDish(
        user.id,
        routeIds.mealGroupId,
        routeIds.reservationId,
        expectedRevision
      );
    await requestMealCalendarSync(mealGroup.id, mealGroup.revision);
    return NextResponse.json({ mealGroup });
  } catch (error) {
    return mealPilotErrorResponse(error, "DELETE /api/meal-groups/[id]/prepared-dishes/[reservationId]");
  }
}
