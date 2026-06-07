import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureMealPlanCookedAtColumn, ensurePlanningOwnershipColumns } from "@/db/ensure-schema";
import { canUserAccessRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── GET /api/meal-plans/:id ───────────────────────────────
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();
    await ensureMealPlanCookedAtColumn();

    const { id } = await context.params;
    const planId = Number(id);

    const plan = await db.query.mealPlans.findFirst({
      where: and(eq(mealPlans.id, planId), eq(mealPlans.userId, currentUser.id)),
      with: {
        recipe: {
          columns: { id: true, title: true, yield: true },
        },
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
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();
    await ensureMealPlanCookedAtColumn();

    const { id } = await context.params;
    const planId = Number(id);
    const body = await request.json();

    const existing = await db.query.mealPlans.findFirst({
      where: and(eq(mealPlans.id, planId), eq(mealPlans.userId, currentUser.id)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      );
    }

    const { date, mealType, recipeId, servings, notes, cookedAt } = body;
    const updateFields: Partial<typeof mealPlans.$inferInsert> = {};

    if (date !== undefined) {
      if (!DATE_RE.test(date)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      updateFields.date = date;
    }

    if (mealType !== undefined) {
      if (!VALID_MEAL_TYPES.includes(mealType)) {
        return NextResponse.json(
          { error: "Invalid meal type. Must be one of: breakfast, lunch, dinner, snack" },
          { status: 400 }
        );
      }
      updateFields.mealType = mealType;
    }

    if (recipeId !== undefined) {
      const recipeIdNumber = Number(recipeId);
      if (!(await canUserAccessRecipe(currentUser.id, recipeIdNumber))) {
        return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
      }
      updateFields.recipeId = recipeIdNumber;
    }
    if (servings !== undefined) updateFields.servings = servings;
    if (notes !== undefined) updateFields.notes = notes;
    if (cookedAt !== undefined) {
      if (cookedAt !== null && typeof cookedAt !== "string") {
        return NextResponse.json(
          { error: "Invalid cookedAt value" },
          { status: 400 }
        );
      }
      updateFields.cookedAt = cookedAt;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    await db
      .update(mealPlans)
      .set(updateFields)
      .where(and(eq(mealPlans.id, planId), eq(mealPlans.userId, currentUser.id)));

    const updatedPlan = await db.query.mealPlans.findFirst({
      where: and(eq(mealPlans.id, planId), eq(mealPlans.userId, currentUser.id)),
      with: {
        recipe: {
          columns: { id: true, title: true, yield: true },
        },
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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();
    await ensureMealPlanCookedAtColumn();

    const { id } = await context.params;
    const planId = Number(id);

    const existing = await db.query.mealPlans.findFirst({
      where: and(eq(mealPlans.id, planId), eq(mealPlans.userId, currentUser.id)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      );
    }

    await db
      .delete(mealPlans)
      .where(and(eq(mealPlans.id, planId), eq(mealPlans.userId, currentUser.id)));

    return NextResponse.json({ message: "Meal plan deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/meal-plans/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete meal plan" },
      { status: 500 }
    );
  }
}
