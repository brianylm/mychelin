import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { mealPlans, recipeAttempts, recipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureMealPlanCookedAtColumn, ensurePlanningOwnershipColumns, ensureRecipeAttemptsTable } from "@/db/ensure-schema";
import { canUserAccessRecipe } from "@/lib/recipe-access";
import { shiftDateKey } from "@/lib/planner-logged-meals";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── GET /api/meal-plans ───────────────────────────────────
// Returns the current user's meal plans for the date range, plus cook
// attempts logged in that range so the calendar can show what was
// actually cooked — even when it was never planned. Attempts are
// fetched with a 1-day pad on each side because cooked_at is UTC while
// the calendar works in local dates; the client re-filters precisely.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureMealPlanCookedAtColumn(),
      ensureRecipeAttemptsTable(),
    ]);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const whereConditions = [eq(mealPlans.userId, currentUser.id)];

    if (startDate) whereConditions.push(gte(mealPlans.date, startDate));
    if (endDate) whereConditions.push(lte(mealPlans.date, endDate));

    const fetchAttempts =
      startDate && endDate && DATE_RE.test(startDate) && DATE_RE.test(endDate);

    const [plans, attemptRows] = await Promise.all([
      db.query.mealPlans.findMany({
        where: and(...whereConditions),
        with: {
          recipe: {
            columns: { id: true, title: true, yield: true },
          },
        },
        orderBy: (mp, { asc }) => [asc(mp.date), asc(mp.mealType)],
      }),
      fetchAttempts
        ? db
            .select({
              id: recipeAttempts.id,
              recipeId: recipeAttempts.recipeId,
              cookedAt: recipeAttempts.cookedAt,
              notes: recipeAttempts.notes,
              mealPlanId: recipeAttempts.mealPlanId,
              recipeTitle: recipes.title,
            })
            .from(recipeAttempts)
            .innerJoin(recipes, eq(recipeAttempts.recipeId, recipes.id))
            .where(
              and(
                eq(recipeAttempts.userId, currentUser.id),
                gte(recipeAttempts.cookedAt, shiftDateKey(startDate, -1)),
                lt(recipeAttempts.cookedAt, shiftDateKey(endDate, 2))
              )
            )
        : Promise.resolve([]),
    ]);

    return NextResponse.json({ plans, attempts: attemptRows });
  } catch (error) {
    console.error("GET /api/meal-plans error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meal plans" },
      { status: 500 }
    );
  }
}

// ─── POST /api/meal-plans ──────────────────────────────────
// Creates a new meal plan for the current user.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureMealPlanCookedAtColumn(),
    ]);

    const body = await request.json();
    const { date, mealType, recipeId, servings, notes } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    if (!DATE_RE.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }
    if (!mealType) {
      return NextResponse.json(
        { error: "Meal type is required" },
        { status: 400 }
      );
    }
    if (!VALID_MEAL_TYPES.includes(mealType)) {
      return NextResponse.json(
        { error: "Invalid meal type. Must be one of: breakfast, lunch, dinner, snack" },
        { status: 400 }
      );
    }
    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    const recipeIdNumber = Number(recipeId);
    if (!(await canUserAccessRecipe(currentUser.id, recipeIdNumber))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const [newPlan] = await db
      .insert(mealPlans)
      .values({
        userId: currentUser.id,
        date,
        mealType,
        recipeId: recipeIdNumber,
        servings: servings || 1,
        notes,
      })
      .returning();

    const fullPlan = await db.query.mealPlans.findFirst({
      where: and(eq(mealPlans.id, newPlan.id), eq(mealPlans.userId, currentUser.id)),
      with: {
        recipe: {
          columns: { id: true, title: true, yield: true },
        },
      },
    });

    await trackUsageEvent({
      userId: currentUser.id,
      eventName: "meal_planned",
      source: "meal_plan",
      recipeId: recipeIdNumber,
      mealPlanId: newPlan.id,
      properties: {
        meal_type: mealType,
        servings: Number(servings || 1),
        has_notes: Boolean(notes),
      },
      path: requestPath(request),
    });

    return NextResponse.json(fullPlan, { status: 201 });
  } catch (error) {
    console.error("POST /api/meal-plans error:", error);
    return NextResponse.json(
      { error: "Failed to create meal plan" },
      { status: 500 }
    );
  }
}
