import { NextRequest, NextResponse } from "next/server";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import {
  getPreparedBatch,
  MealPilotError,
  updatePreparedBatch,
} from "@/lib/meal-pilot/service";
import { mealPilotErrorResponse, numericRouteId } from "@/lib/meal-pilot/http";
import type { UpdatePreparedBatchRequest } from "@/lib/meal-pilot/types";

export const runtime = "edge";
export const preferredRegion = "hnd1";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const id = numericRouteId((await context.params).id);
    if (id == null) throw new MealPilotError("Prepared batch not found", 404, "NOT_FOUND");
    return NextResponse.json({ batch: await getPreparedBatch(user.id, id) });
  } catch (error) {
    return mealPilotErrorResponse(error, "GET /api/prepared-batches/[id]");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const id = numericRouteId((await context.params).id);
    if (id == null) throw new MealPilotError("Prepared batch not found", 404, "NOT_FOUND");
    const body = (await request.json()) as UpdatePreparedBatchRequest;
    return NextResponse.json({ batch: await updatePreparedBatch(user.id, id, body) });
  } catch (error) {
    return mealPilotErrorResponse(error, "PATCH /api/prepared-batches/[id]");
  }
}
