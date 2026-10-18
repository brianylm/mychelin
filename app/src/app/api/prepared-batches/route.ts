import { NextRequest, NextResponse } from "next/server";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { createPreparedBatch, listPreparedBatches } from "@/lib/meal-pilot/service";
import { mealPilotErrorResponse } from "@/lib/meal-pilot/http";
import type { CreatePreparedBatchRequest } from "@/lib/meal-pilot/types";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    return NextResponse.json({ batches: await listPreparedBatches(user.id) });
  } catch (error) {
    return mealPilotErrorResponse(error, "GET /api/prepared-batches");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const body = (await request.json()) as CreatePreparedBatchRequest;
    return NextResponse.json(
      { batch: await createPreparedBatch(user.id, body) },
      { status: 201 }
    );
  } catch (error) {
    return mealPilotErrorResponse(error, "POST /api/prepared-batches");
  }
}
