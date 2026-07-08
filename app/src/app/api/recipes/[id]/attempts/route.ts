import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificationJobs, notificationPreferences, recipeAttempts, recipes } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { ensureNotificationTables, ensureRecipeAttemptDishRatingColumn, ensureRecipeAttemptsTable } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

function parseJsonArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  const rounded = Math.round(rating * 2) / 2;
  if (rounded < 0.5 || rounded > 5) return null;
  return rounded;
}

async function queuePostCookReviewReminder(userId: number) {
  try {
    await ensureNotificationTables();
    const prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });
    if (prefs && !prefs.reviewReminders) return;

    const dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.insert(notificationJobs).values({
      userId,
      type: "post_cook_review",
      title: "Review your latest cook",
      body: "How did the dish turn out? Add a quick rating while the meal is still fresh.",
      url: "/app",
      dueAt,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("post-cook review reminder skipped:", error);
  }
}

function parseAttempt(row: typeof recipeAttempts.$inferSelect) {
  return {
    ...row,
    changeNotes: parseJsonArray(row.changeNotes),
    ingredientsSnapshot: parseJsonArray(row.ingredientsSnapshot),
    instructionsSnapshot: parseJsonArray(row.instructionsSnapshot),
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeAttemptsTable();
    await ensureRecipeAttemptDishRatingColumn();
    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const attempts = await db
      .select()
      .from(recipeAttempts)
      .where(
        and(
          eq(recipeAttempts.recipeId, recipeId),
          eq(recipeAttempts.userId, currentUser.id)
        )
      )
      .orderBy(desc(recipeAttempts.cookedAt), desc(recipeAttempts.id));

    return NextResponse.json(attempts.map(parseAttempt));
  } catch (error) {
    console.error("GET /api/recipes/[id]/attempts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeAttemptsTable();
    await ensureRecipeAttemptDishRatingColumn();
    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      columns: { activeVersionId: true },
    });
    const body = await request.json();
    const now = new Date().toISOString();
    const rating = normalizeRating(body.rating);
    const dishRating = normalizeRating(body.dishRating);

    if (body.rating !== undefined && body.rating !== null && rating === null) {
      return NextResponse.json(
        { error: "rating must be a half-star value from 0.5 to 5" },
        { status: 400 }
      );
    }

    if (body.dishRating !== undefined && body.dishRating !== null && dishRating === null) {
      return NextResponse.json(
        { error: "dishRating must be a half-star value from 0.5 to 5" },
        { status: 400 }
      );
    }

    const [attempt] = await db
      .insert(recipeAttempts)
      .values({
        recipeId,
        versionId: body.versionId ? Number(body.versionId) : recipe?.activeVersionId ?? null,
        mealPlanId: body.mealPlanId ? Number(body.mealPlanId) : null,
        userId: currentUser.id,
        cookedAt: typeof body.cookedAt === "string" ? body.cookedAt : now,
        rating,
        dishRating,
        notes: body.notes ?? null,
        changeNotes: Array.isArray(body.changeNotes)
          ? JSON.stringify(body.changeNotes)
          : null,
        whatWorked: body.whatWorked ?? null,
        nextTime: body.nextTime ?? null,
        ingredientsSnapshot: Array.isArray(body.ingredientsSnapshot)
          ? JSON.stringify(body.ingredientsSnapshot)
          : null,
        instructionsSnapshot: Array.isArray(body.instructionsSnapshot)
          ? JSON.stringify(body.instructionsSnapshot)
          : null,
        createdAt: now,
      })
      .returning();

    await trackUsageEvent({
      userId: currentUser.id,
      eventName: "cook_attempt_created",
      source: typeof body.source === "string" ? body.source : "cook_with_me",
      recipeId,
      mealPlanId: body.mealPlanId ? Number(body.mealPlanId) : null,
      properties: {
        has_rating: rating !== null,
        rating: rating ?? null,
        has_dish_rating: dishRating !== null,
        has_next_time: Boolean(body.nextTime),
        change_notes_count: Array.isArray(body.changeNotes) ? body.changeNotes.length : 0,
        ingredients_count: Array.isArray(body.ingredientsSnapshot) ? body.ingredientsSnapshot.length : 0,
        steps_count: Array.isArray(body.instructionsSnapshot) ? body.instructionsSnapshot.length : 0,
        from_meal_plan: Boolean(body.mealPlanId),
      },
      path: requestPath(request),
    });

    await queuePostCookReviewReminder(currentUser.id);

    return NextResponse.json(parseAttempt(attempt), { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes/[id]/attempts error:", error);
    return NextResponse.json(
      { error: "Failed to create attempt" },
      { status: 500 }
    );
  }
}
