import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans, recipes, ingredients, inventory, ingredientCatalog } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";

interface ShoppingListItem {
  name: string;
  category: string | null;
  quantityNeeded: number;
  quantityOnHand: number;
  quantityToBuy: number;
  unit: string;
}

// ─── GET /api/shopping-list ────────────────────────────────
// Generate shopping list for a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Both startDate and endDate are required (YYYY-MM-DD format)" },
        { status: 400 }
      );
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Step 1: Fetch all meal plans in date range with their recipes and ingredients
    const mealPlansInRange = await db.query.mealPlans.findMany({
      where: and(
        gte(mealPlans.date, startDate),
        lte(mealPlans.date, endDate)
      ),
      with: {
        recipe: {
          with: {
            ingredients: {
              with: {
                catalogIngredient: true
              }
            }
          }
        }
      },
    });

    // Step 2: Scale ingredient quantities by servings multiplier and aggregate
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
        
        // Create aggregation key - prefer catalogIngredientId, fallback to name+unit
        const aggregationKey = ingredient.catalogIngredientId 
          ? `catalog_${ingredient.catalogIngredientId}`
          : `manual_${ingredient.name.toLowerCase().trim()}_${(ingredient.unit || '').toLowerCase().trim()}`;

        if (neededIngredients.has(aggregationKey)) {
          // Add to existing entry (same ingredient, same unit)
          const existing = neededIngredients.get(aggregationKey)!;
          existing.quantityNeeded += scaledQuantity;
        } else {
          // New entry
          neededIngredients.set(aggregationKey, {
            name: ingredient.catalogIngredient?.name || ingredient.name,
            category: ingredient.catalogIngredient?.category || null,
            quantityNeeded: scaledQuantity,
            unit: ingredient.unit || '',
            catalogIngredientId: ingredient.catalogIngredientId,
          });
        }
      }
    }

    // Step 3: Fetch inventory and subtract available quantities
    const inventoryItems = await db.query.inventory.findMany({
      with: {
        catalogIngredient: true
      }
    });

    // Create inventory lookup
    const inventoryLookup = new Map<string, number>();
    for (const invItem of inventoryItems) {
      const invKey = invItem.catalogIngredientId 
        ? `catalog_${invItem.catalogIngredientId}`
        : `manual_${invItem.name.toLowerCase().trim()}_${invItem.unit.toLowerCase().trim()}`;
      
      if (inventoryLookup.has(invKey)) {
        inventoryLookup.set(invKey, inventoryLookup.get(invKey)! + invItem.quantity);
      } else {
        inventoryLookup.set(invKey, invItem.quantity);
      }
    }

    // Step 4: Calculate final shopping list (only items where needed > on hand)
    const shoppingList: ShoppingListItem[] = [];

    for (const [key, needed] of neededIngredients.entries()) {
      const quantityOnHand = inventoryLookup.get(key) || 0;
      const quantityToBuy = Math.max(0, needed.quantityNeeded - quantityOnHand);

      // Only include items that need to be purchased
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

    // Sort by category, then by name
    shoppingList.sort((a, b) => {
      if (a.category && b.category) {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
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