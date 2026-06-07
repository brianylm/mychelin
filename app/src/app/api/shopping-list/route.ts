import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { inventory, mealPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensurePlanningOwnershipColumns } from "@/db/ensure-schema";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

interface ShoppingListItem {
  key: string;
  name: string;
  category: string | null;
  quantityNeeded: number | null;
  quantityOnHand: number;
  quantityToBuy: number | null;
  quantityLabel: string;
  unit: string;
  approximate: boolean;
  sourceMealCount: number;
}

interface NeededIngredient {
  key: string;
  name: string;
  category: string | null;
  quantityNeeded: number | null;
  unit: string;
  catalogIngredientId: number | null;
  approximate: boolean;
  quantityLabel: string;
  sourceMealIds: Set<number>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeText(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function quantityLabel(quantity: number | null, unit: string): string {
  if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) return unit || "as needed";
  return [formatQuantity(quantity), unit].filter(Boolean).join(" ");
}

function manualKey(name: string, unit: string): string {
  return "manual_" + normalizeText(name) + "_" + normalizeText(unit);
}

function approximateKey(name: string, label: string): string {
  return "approx_" + normalizeText(name) + "_" + normalizeText(label);
}

// ─── GET /api/shopping-list ────────────────────────────────
// Generate a shopping list from the current user's meal plan and inventory.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Both startDate and endDate are required (YYYY-MM-DD format)" },
        { status: 400 }
      );
    }

    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const mealPlansInRange = await db.query.mealPlans.findMany({
      where: and(
        eq(mealPlans.userId, currentUser.id),
        gte(mealPlans.date, startDate),
        lte(mealPlans.date, endDate)
      ),
      with: {
        recipe: {
          with: {
            ingredients: {
              with: {
                catalogIngredient: true,
              },
            },
          },
        },
      },
    });

    const neededIngredients = new Map<string, NeededIngredient>();

    for (const mealPlan of mealPlansInRange) {
      const servingsMultiplier = mealPlan.servings || 1;

      for (const ingredient of mealPlan.recipe.ingredients) {
        const name = ingredient.catalogIngredient?.name || ingredient.name;
        const unit = ingredient.unit || "";
        const category = ingredient.catalogIngredient?.category || null;
        const hasNumericQuantity =
          typeof ingredient.quantity === "number" &&
          Number.isFinite(ingredient.quantity) &&
          ingredient.quantity > 0 &&
          !ingredient.approximate;

        const scaledQuantity = hasNumericQuantity
          ? ingredient.quantity! * servingsMultiplier
          : null;
        const displayLabel = ingredient.approximate
          ? ingredient.quantityText?.trim() || quantityLabel(scaledQuantity, unit)
          : quantityLabel(scaledQuantity, unit);
        const aggregationKey = hasNumericQuantity
          ? ingredient.catalogIngredientId
            ? "catalog_" + ingredient.catalogIngredientId + "_" + normalizeText(unit)
            : manualKey(name, unit)
          : approximateKey(name, displayLabel);

        const existing = neededIngredients.get(aggregationKey);
        if (existing) {
          if (scaledQuantity != null) {
            existing.quantityNeeded = (existing.quantityNeeded || 0) + scaledQuantity;
            existing.quantityLabel = quantityLabel(existing.quantityNeeded, existing.unit);
          }
          existing.sourceMealIds.add(mealPlan.id);
        } else {
          neededIngredients.set(aggregationKey, {
            key: aggregationKey,
            name,
            category,
            quantityNeeded: scaledQuantity,
            unit,
            catalogIngredientId: hasNumericQuantity ? ingredient.catalogIngredientId : null,
            approximate: !hasNumericQuantity,
            quantityLabel: displayLabel,
            sourceMealIds: new Set([mealPlan.id]),
          });
        }
      }
    }

    const inventoryItems = await db.query.inventory.findMany({
      where: eq(inventory.userId, currentUser.id),
      with: {
        catalogIngredient: true,
      },
    });

    const inventoryLookup = new Map<string, number>();
    for (const invItem of inventoryItems) {
      const invKey = invItem.catalogIngredientId
        ? "catalog_" + invItem.catalogIngredientId + "_" + normalizeText(invItem.unit)
        : manualKey(invItem.name, invItem.unit);

      inventoryLookup.set(invKey, (inventoryLookup.get(invKey) || 0) + invItem.quantity);
    }

    const shoppingList: ShoppingListItem[] = [];

    for (const needed of neededIngredients.values()) {
      const quantityOnHand = needed.catalogIngredientId
        ? inventoryLookup.get("catalog_" + needed.catalogIngredientId + "_" + normalizeText(needed.unit)) || 0
        : inventoryLookup.get(manualKey(needed.name, needed.unit)) || 0;
      const quantityToBuy = needed.quantityNeeded == null
        ? null
        : Math.max(0, needed.quantityNeeded - quantityOnHand);

      if (quantityToBuy != null && quantityToBuy <= 0) continue;

      shoppingList.push({
        key: needed.key,
        name: needed.name,
        category: needed.category,
        quantityNeeded: needed.quantityNeeded,
        quantityOnHand,
        quantityToBuy,
        quantityLabel: quantityToBuy == null ? needed.quantityLabel : quantityLabel(quantityToBuy, needed.unit),
        unit: needed.unit,
        approximate: needed.approximate,
        sourceMealCount: needed.sourceMealIds.size,
      });
    }

    shoppingList.sort((a, b) => {
      if (a.category && b.category) {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
      } else if (a.category && !b.category) {
        return -1;
      } else if (!a.category && b.category) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });

    await trackUsageEvent({
      userId: currentUser.id,
      eventName: "shopping_list_generated",
      source: "shopping_list",
      properties: {
        meal_count: mealPlansInRange.length,
        recipe_count: new Set(mealPlansInRange.map((plan) => plan.recipeId)).size,
        item_count: shoppingList.length,
        approximate_item_count: shoppingList.filter((item) => item.approximate).length,
      },
      path: requestPath(request),
    });

    return NextResponse.json({
      items: shoppingList,
      summary: {
        startDate,
        endDate,
        mealCount: mealPlansInRange.length,
        recipeCount: new Set(mealPlansInRange.map((plan) => plan.recipeId)).size,
        itemCount: shoppingList.length,
      },
    });
  } catch (error) {
    console.error("GET /api/shopping-list error:", error);
    return NextResponse.json(
      { error: "Failed to generate shopping list" },
      { status: 500 }
    );
  }
}
