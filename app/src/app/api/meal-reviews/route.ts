import { NextRequest, NextResponse } from "next/server";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { listMealReviews } from "@/lib/meal-pilot/service";
import { mealPilotErrorResponse } from "@/lib/meal-pilot/http";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureMealPilotTables();
    const before = request.nextUrl.searchParams.get("before") ?? new Date().toISOString();
    const reviews = await listMealReviews(user.id, before);
    return NextResponse.json({
      reviews: reviews.map((mealGroup) => ({ mealGroup, elapsedAt: mealGroup.serveAt })),
    });
  } catch (error) {
    return mealPilotErrorResponse(error, "GET /api/meal-reviews");
  }
}
