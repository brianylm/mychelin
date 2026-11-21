import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureHouseholdTables, ensureMealPilotTables, ensureMealPlanBlocksTable, ensureMealPlanCookedAtColumn, ensurePlanningOwnershipColumns } from "@/db/ensure-schema";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";
import { createMealPlanForUser, mealsLabel, type MealPlanInput } from "@/lib/meal-plan-writes";
import { requestPath } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// A month view has at most 6 weeks × 4 meal types = 168 slots, but a roll
// that size is not a real use; cap the batch to keep the request bounded.
const MAX_RANDOMISE_SLOTS = 50;

// ─── POST /api/meal-plans/randomise ────────────────────────
// Applies one randomize roll: creates a plan row per slot with the same
// rules, recipe-access check and block-lifting as POST /api/meal-plans.
// On a household plan the feed gets ONE "randomized_plan" summary entry
// instead of an "added_meal" entry per slot.
// Body: { slots: [{ date, mealType, recipeId, servings? }] }
// Returns { plans, failed: [{ index, error }] }.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const slots: unknown = body?.slots;
    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: "slots must be a non-empty array" }, { status: 400 });
    }
    if (slots.length > MAX_RANDOMISE_SLOTS) {
      return NextResponse.json(
        { error: `At most ${MAX_RANDOMISE_SLOTS} slots per roll` },
        { status: 400 }
      );
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureMealPlanCookedAtColumn(),
      ensureMealPlanBlocksTable(),
      ensureHouseholdTables(),
      ensureMealPilotTables(),
    ]);

    const membership = await getUserHousehold(currentUser.id);
    const householdId = membership?.household.id ?? null;
    const path = requestPath(request);

    const plans: unknown[] = [];
    const failed: Array<{ index: number; error: string }> = [];
    for (let index = 0; index < slots.length; index++) {
      const slot = slots[index];
      if (!slot || typeof slot !== "object") {
        failed.push({ index, error: "Invalid slot" });
        continue;
      }
      const { date, mealType, recipeId, servings } = slot as MealPlanInput;
      const result = await createMealPlanForUser({
        user: currentUser,
        householdId,
        // Notes are never part of a roll.
        input: { date, mealType, recipeId, servings },
        path,
        source: "meal_plan_randomize",
        logActivity: false,
      });
      if ("error" in result) failed.push({ index, error: result.error });
      else plans.push(result.plan);
    }

    if (householdId != null && plans.length > 0) {
      await logHouseholdActivity(
        householdId,
        currentUser.id,
        "randomized_plan",
        mealsLabel(plans.length)
      );
    }

    return NextResponse.json({ plans, failed }, { status: plans.length > 0 ? 201 : 400 });
  } catch (error) {
    console.error("POST /api/meal-plans/randomise error:", error);
    return NextResponse.json({ error: "Failed to randomize meal plan" }, { status: 500 });
  }
}
