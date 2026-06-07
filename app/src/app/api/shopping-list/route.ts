import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { inventory, mealPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensurePlanningOwnershipColumns } from "@/db/ensure-schema";

export const runtime = "edge";
export const preferredRegion = "hnd1";

interface ShoppingListItem {
  name: string;
  category: string | null;
  quantityNeeded: number;
  quantityOnHand: number;
  quantityToBuy: number;
  unit: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

    const neededIngredients = new Map<string, {
      name: string;
      category: string | null;
      quantityNeeded: number;
      unit: string;
      catalogIngredientId: number | null;
    }>();

    for (const mealPlan of mealPlansInRange) {
      const servingsMultiplier = mealPlan.servings;

      for (const ingredient of mealPlan.recipe.ingredients) {
        const scaledQuantity = (ingredient.quantity || 0) * servingsMultiplier;
        const aggregationKey = ingredient.catalogIngredientId
          ? `catalog_${ingredient.catalogIngredientId}`
          : `manual_${ingredient.name.toLowerCase().trim()}_${(ingredient.unit || "").toLowerCase().trim()}`;

        if (neededIngredients.has(aggregationKey)) {
          neededIngredients.get(aggregationKey)!.quantityNeeded += scaledQuantity;
        } else {
          neededIngredients.set(aggregationKey, {
            name: ingredient.catalogIngredient?.name || ingredient.name,
            category: ingredient.catalogIngredient?.category || null,
            quantityNeeded: scaledQuantity,
            unit: ingredient.unit || "",
            catalogIngredientId: ingredient.catalogIngredientId,
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
        ? `catalog_${invItem.catalogIngredientId}`
        : `manual_${invItem.name.toLowerCase().trim()}_${invItem.unit.toLowerCase().trim()}`;

      inventoryLookup.set(invKey, (inventoryLookup.get(invKey) || 0) + invItem.quantity);
    }

    const shoppingList: ShoppingListItem[] = [];

    for (const needed of neededIngredients.values()) {
      const key = needed.catalogIngredientId
        ? `catalog_${needed.catalogIngredientId}`
        : `manual_${needed.name.toLowerCase().trim()}_${needed.unit.toLowerCase().trim()}`;
      const quantityOnHand = inventoryLookup.get(key) || 0;
      const quantityToBuy = Math.max(0, needed.quantityNeeded - quantityOnHand);

      if (quantityToBuy > 0) {
        shoppingList.push({
          name: needed.name,
          category: needed.category,
          quantityNeeded: needed.quantityNeeded,
          quantityOnHand,
          quantityToBuy,
          unit: needed.unit,
        });
      }
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

    return NextResponse.json({ items: shoppingList });
  } catch (error) {
    console.error("GET /api/shopping-list error:", error);
    return NextResponse.json(
      { error: "Failed to generate shopping list" },
      { status: 500 }
    );
  }
}
