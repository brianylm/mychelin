import { NextRequest, NextResponse } from "next/server";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { MealPilotError, undoMealConfirmation } from "@/lib/meal-pilot/service";
import { mealPilotErrorResponse, numericRouteId } from "@/lib/meal-pilot/http";
import type { UndoMealConfirmationRequest } from "@/lib/meal-pilot/types";
import { requestMealCalendarSync } from "@/lib/meal-calendar/store";

export const runtime = "edge";
export const preferredRegion = "hnd1";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const id = numericRouteId((await context.params).id);
    if (id == null) throw new MealPilotError("Meal not found", 404, "NOT_FOUND");
    const body = (await request.json()) as UndoMealConfirmationRequest;
    const mealGroup = await undoMealConfirmation(user.id, id, body);
    await requestMealCalendarSync(mealGroup.id, mealGroup.revision);
    return NextResponse.json({ mealGroup });
  } catch (error) {
    return mealPilotErrorResponse(error, "POST /api/meal-groups/[id]/undo-confirmation");
  }
}
