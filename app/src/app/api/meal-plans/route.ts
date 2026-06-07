import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureMealPlanCookedAtColumn, ensurePlanningOwnershipColumns } from "@/db/ensure-schema";
import { canUserAccessRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── GET /api/meal-plans ───────────────────────────────────
// Returns meal plans owned by the current user, optionally filtered by date.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();
    await ensureMealPlanCookedAtColumn();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const whereConditions = [eq(mealPlans.userId, currentUser.id)];

    if (startDate) whereConditions.push(gte(mealPlans.date, startDate));
    if (endDate) whereConditions.push(lte(mealPlans.date, endDate));

    const plans = await db.query.mealPlans.findMany({
      where: and(...whereConditions),
      with: {
        recipe: {
          columns: { id: true, title: true, yield: true },
        },
      },
      orderBy: (mp, { asc }) => [asc(mp.date), asc(mp.mealType)],
    });

    return NextResponse.json(plans);
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

    await ensurePlanningOwnershipColumns();
    await ensureMealPlanCookedAtColumn();

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

    return NextResponse.json(fullPlan, { status: 201 });
  } catch (error) {
    console.error("POST /api/meal-plans error:", error);
    return NextResponse.json(
      { error: "Failed to create meal plan" },
      { status: 500 }
    );
  }
}
