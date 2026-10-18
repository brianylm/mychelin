import { NextRequest, NextResponse } from "next/server";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { MealPilotError, transferPreparedPortions } from "@/lib/meal-pilot/service";
import { mealPilotErrorResponse, numericRouteId } from "@/lib/meal-pilot/http";
import type { TransferPreparedPortionsRequest } from "@/lib/meal-pilot/types";

export const runtime = "edge";
export const preferredRegion = "hnd1";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const id = numericRouteId((await context.params).id);
    if (id == null) throw new MealPilotError("Prepared batch not found", 404, "NOT_FOUND");
    const body = (await request.json()) as TransferPreparedPortionsRequest;
    return NextResponse.json({
      batch: await transferPreparedPortions(user.id, id, body),
    });
  } catch (error) {
    return mealPilotErrorResponse(error, "POST /api/prepared-batches/[id]/transfer");
  }
}
