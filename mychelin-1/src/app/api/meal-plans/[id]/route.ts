import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/meal-plans/:id ───────────────────────────────
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const planId = Number(id);

    const plan = await db.query.mealPlans.findFirst({
      where: eq(mealPlans.id, planId),
      with: {
        recipe: {
          columns: { id: true, title: true, yield: true }
        }
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("GET /api/meal-plans/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meal plan" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/meal-plans/:id ─────────────────────────────
// Update a meal plan (partial update supported)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const planId = Number(id);
    const body = await request.json();

    // Check meal plan exists
    const existing = await db.query.mealPlans.findFirst({
      where: eq(mealPlans.id, planId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      );
    }

    const { date, mealType, recipeId, servings, notes } = body;
    const updateFields: any = {};
    
    if (date !== undefined) {
      // Validate date format (basic check)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      updateFields.date = date;
    }
    
    if (mealType !== undefined) {
      // Validate mealType
      const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
      if (!validMealTypes.includes(mealType)) {
        return NextResponse.json(
          { error: "Invalid meal type. Must be one of: breakfast, lunch, dinner, snack" },
          { status: 400 }
        );
      }
      updateFields.mealType = mealType;
    }
    
    if (recipeId !== undefined) updateFields.recipeId = Number(recipeId);
    if (servings !== undefined) updateFields.servings = servings;
    if (notes !== undefined) updateFields.notes = notes;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    await db
      .update(mealPlans)
      .set(updateFields)
      .where(eq(mealPlans.id, planId));

    // Return updated meal plan with recipe details
    const updatedPlan = await db.query.mealPlans.findFirst({
      where: eq(mealPlans.id, planId),
      with: {
        recipe: {
          columns: { id: true, title: true, yield: true }
        }
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error("PATCH /api/meal-plans/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update meal plan" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/meal-plans/:id ────────────────────────────
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const planId = Number(id);

    const existing = await db.query.mealPlans.findFirst({
      where: eq(mealPlans.id, planId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      );
    }

    await db.delete(mealPlans).where(eq(mealPlans.id, planId));

    return NextResponse.json({ message: "Meal plan deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/meal-plans/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete meal plan" },
      { status: 500 }
    );
  }
}