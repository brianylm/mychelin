import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventory, mealPlans, recipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureHouseholdSlice2Tables } from "@/db/ensure-schema";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";
import {
  applyDeductions,
  matchInventoryRow,
  type DeductionItem,
} from "@/lib/household-inventory";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/households/inventory/deduct ─────────────────
// Cook-time confirm-deduct: the cook confirms (after optionally editing
// quantities) the proposed ingredient deduction for a planned household
// meal, and the shared inventory is decremented. Trap check: this only
// runs when the cooked recipe belongs to the cook AND the meal is on
// their household's plan — ephemeral cooks of other people's recipes
// (Slice 3) must never deduct.
export async function POST(request: NextRequest) {
  try {
    if (!HOUSEHOLDS_ENABLED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureHouseholdSlice2Tables();

    const membership = await getUserHousehold(currentUser.id);
    if (!membership) {
      return NextResponse.json(
        { error: "You're not in a household" },
        { status: 404 }
      );
    }
    const householdId = membership.household.id;

    const body = await request.json();
    const mealPlanId = Number(body.mealPlanId);
    if (!Number.isInteger(mealPlanId)) {
      return NextResponse.json({ error: "mealPlanId is required" }, { status: 400 });
    }
    const items: DeductionItem[] = Array.isArray(body.items)
      ? body.items
          .map((item: Record<string, unknown>) => ({
            name: typeof item.name === "string" ? item.name.trim() : "",
            unit: typeof item.unit === "string" ? item.unit.trim() : "",
            quantity: Number(item.quantity),
            catalogIngredientId:
              item.catalogIngredientId != null ? Number(item.catalogIngredientId) : null,
          }))
          .filter((item: DeductionItem) => item.name && Number.isFinite(item.quantity))
      : [];

    const [plan] = await db
      .select({ id: mealPlans.id, recipeId: mealPlans.recipeId })
      .from(mealPlans)
      .where(and(eq(mealPlans.id, mealPlanId), eq(mealPlans.householdId, householdId)))
      .limit(1);
    if (!plan) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    // Trap check, server-side: the cooked recipe must be the cook's own.
    const [recipe] = await db
      .select({ userId: recipes.userId })
      .from(recipes)
      .where(eq(recipes.id, plan.recipeId))
      .limit(1);
    if (!recipe || recipe.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Deduction is only available for your own recipes" },
        { status: 403 }
      );
    }

    const rows = await db
      .select({
        id: inventory.id,
        name: inventory.name,
        unit: inventory.unit,
        quantity: inventory.quantity,
        catalogIngredientId: inventory.catalogIngredientId,
      })
      .from(inventory)
      .where(eq(inventory.householdId, householdId));

    const confirmations: Array<DeductionItem & { inventoryId: number }> = [];
    const notTracked: string[] = [];
    for (const item of items) {
      if (item.quantity <= 0) continue;
      const match = matchInventoryRow(item, rows);
      if (match) {
        confirmations.push({ ...item, inventoryId: match.id });
      } else {
        // Unmatched ingredients are skipped silently and listed as
        // "not tracked" (packet decision 4).
        notTracked.push(item.name);
      }
    }

    const results = applyDeductions(confirmations, rows);
    const now = new Date().toISOString();
    for (const result of results) {
      // Zero/negative stock is a warning state, never a block.
      await db
        .update(inventory)
        .set({ quantity: result.remaining, updatedAt: now })
        .where(and(eq(inventory.id, result.inventoryId), eq(inventory.householdId, householdId)));
      await logHouseholdActivity(householdId, currentUser.id, "used_item", result.name);
    }

    return NextResponse.json({ deducted: results, notTracked });
  } catch (error) {
    console.error("POST /api/households/inventory/deduct error:", error);
    return NextResponse.json(
      { error: "Failed to deduct from inventory" },
      { status: 500 }
    );
  }
}
