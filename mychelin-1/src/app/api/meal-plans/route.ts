import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { and, gte, lte, asc, eq } from "drizzle-orm";

export const preferredRegion = "hnd1";

// ─── GET /api/meal-plans ───────────────────────────────────
// Returns meal plans with optional date range filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let whereConditions: any[] = [];

    if (startDate) {
      whereConditions.push(gte(mealPlans.date, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(mealPlans.date, endDate));
    }

    const plans = await db.query.mealPlans.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        recipe: {
          columns: { id: true, title: true, yield: true }
        }
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
// Creates a new meal plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, mealType, recipeId, servings, notes } = body;

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    if (!mealType) {
      return NextResponse.json(
        { error: "Meal type is required" },
        { status: 400 }
      );
    }

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    // Validate mealType
    const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
    if (!validMealTypes.includes(mealType)) {
      return NextResponse.json(
        { error: "Invalid meal type. Must be one of: breakfast, lunch, dinner, snack" },
        { status: 400 }
      );
    }

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const [newPlan] = await db
      .insert(mealPlans)
      .values({
        date,
        mealType,
        recipeId: Number(recipeId),
        servings: servings || 1,
        notes,
      })
      .returning();

    // Return the meal plan with recipe details
    const fullPlan = await db.query.mealPlans.findFirst({
      where: eq(mealPlans.id, newPlan.id),
      with: {
        recipe: {
          columns: { id: true, title: true, yield: true }
        }
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