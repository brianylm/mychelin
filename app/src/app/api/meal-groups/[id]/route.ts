import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mealGroups, mealPlans } from "@/db/schema";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { getMealGroup, MealPilotError, updateMealGroup } from "@/lib/meal-pilot/service";
import { mealPilotErrorResponse, numericRouteId } from "@/lib/meal-pilot/http";
import type { UpdateMealGroupRequest } from "@/lib/meal-pilot/types";
import { queueMealCalendarRemoval, requestMealCalendarSync } from "@/lib/meal-calendar/store";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const id = numericRouteId((await context.params).id);
    if (id == null) throw new MealPilotError("Meal not found", 404, "NOT_FOUND");
    return NextResponse.json({ mealGroup: await getMealGroup(user.id, id) });
  } catch (error) {
    return mealPilotErrorResponse(error, "GET /api/meal-groups/[id]");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const id = numericRouteId((await context.params).id);
    if (id == null) throw new MealPilotError("Meal not found", 404, "NOT_FOUND");
    const body = (await request.json()) as UpdateMealGroupRequest;
    const mealGroup = await updateMealGroup(user.id, id, body);
    await requestMealCalendarSync(mealGroup.id, mealGroup.revision);
    return NextResponse.json({ mealGroup });
  } catch (error) {
    return mealPilotErrorResponse(error, "PATCH /api/meal-groups/[id]");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const id = numericRouteId((await context.params).id);
    if (id == null) throw new MealPilotError("Meal not found", 404, "NOT_FOUND");
    const existing = await getMealGroup(user.id, id);
    const expectedRevision = Number(request.nextUrl.searchParams.get("expectedRevision"));
    if (!Number.isInteger(expectedRevision) || expectedRevision !== existing.revision) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    if (existing.status !== "planned") {
      throw new MealPilotError("Completed meals cannot be deleted", 409, "ALREADY_CONFIRMED");
    }
    await db.transaction(async (tx) => {
      await queueMealCalendarRemoval(tx, id);
      await tx.delete(mealPlans).where(eq(mealPlans.mealGroupId, id));
      const deleted = await tx
        .delete(mealGroups)
        .where(and(eq(mealGroups.id, id), eq(mealGroups.revision, expectedRevision)))
        .returning({ id: mealGroups.id });
      if (deleted.length === 0) {
        throw new MealPilotError(
          "This meal changed elsewhere. Reload and try again.",
          409,
          "REVISION_CONFLICT"
        );
      }
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return mealPilotErrorResponse(error, "DELETE /api/meal-groups/[id]");
  }
}
