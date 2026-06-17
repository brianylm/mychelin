import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans, recipeAttempts, recipes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensurePlanningOwnershipColumns, ensureRecipeAttemptDishRatingColumn, ensureRecipeAttemptsTable } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

function parseJsonArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeAttemptsTable();
    await ensureRecipeAttemptDishRatingColumn();
    await ensurePlanningOwnershipColumns();

    const rows = await db
      .select({
        id: recipeAttempts.id,
        recipeId: recipeAttempts.recipeId,
        recipeTitle: recipes.title,
        recipeImageUrl: recipes.imageUrl,
        cookedAt: recipeAttempts.cookedAt,
        sessionEaseRating: recipeAttempts.rating,
        dishRating: recipeAttempts.dishRating,
        notes: recipeAttempts.notes,
        nextTime: recipeAttempts.nextTime,
        changeNotes: recipeAttempts.changeNotes,
        promotedVersionId: recipeAttempts.promotedVersionId,
        mealPlanId: recipeAttempts.mealPlanId,
        mealDate: mealPlans.date,
        mealType: mealPlans.mealType,
      })
      .from(recipeAttempts)
      .innerJoin(recipes, eq(recipeAttempts.recipeId, recipes.id))
      .leftJoin(mealPlans, eq(recipeAttempts.mealPlanId, mealPlans.id))
      .where(eq(recipeAttempts.userId, currentUser.id))
      .orderBy(desc(recipeAttempts.cookedAt), desc(recipeAttempts.id))
      .limit(90);

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        changeNotes: parseJsonArray(row.changeNotes),
      }))
    );
  } catch (error) {
    console.error("GET /api/activity error:", error);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
