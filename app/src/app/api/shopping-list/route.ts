import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  householdMemberBlocks,
  householdMembers,
  inventory,
  mealPlans,
  shoppingListItems,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureHouseholdSlice2Tables,
  ensurePlanningOwnershipColumns,
} from "@/db/ensure-schema";
import { getUserHousehold } from "@/lib/households";
import {
  blockedMembersForSlot,
  type HouseholdBlockScope,
  type HouseholdMemberBlockView,
} from "@/lib/household-blocking";
import { blockingScaleFactor } from "@/lib/household-portions";
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
  catalogIngredientId: number | null;
  // Household mode only: persisted shared tick state (2-step flow —
  // ticking marks bought; moving to inventory is a separate action).
  ticked?: boolean;
  tickedByName?: string | null;
  manual?: boolean;
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
// Solo users: the list is generated from their meal plan and inventory,
// exactly as before — no rows are ever read or written for them.
//
// Household members: the list generates from the SHARED plan with
// quantities scaled by non-blocked eaters (fully blocked slots drop
// out), offsets against the SHARED inventory, merges manual adds, and
// annotates each item with the shared tick state. Items already moved
// to inventory come back in `movedItems` (shown as such, never
// re-pushed — the 2-step flow is idempotent).
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureHouseholdSlice2Tables(),
    ]);

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

    const membership = await getUserHousehold(currentUser.id);

    const mealPlansInRange = await db.query.mealPlans.findMany({
      where: membership
        ? and(
            eq(mealPlans.householdId, membership.household.id),
            gte(mealPlans.date, startDate),
            lte(mealPlans.date, endDate)
          )
        : and(
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

    // Household-only context for blocking-aware scaling.
    let memberBlocks: HouseholdMemberBlockView[] = [];
    let memberCount = 0;
    let stateRows: Array<typeof shoppingListItems.$inferSelect> = [];
    if (membership) {
      const [blockRows, shoppingRows] = await Promise.all([
        db
          .select({
            id: householdMemberBlocks.id,
            userId: householdMemberBlocks.userId,
            scope: householdMemberBlocks.scope,
            date: householdMemberBlocks.date,
            mealType: householdMemberBlocks.mealType,
          })
          .from(householdMemberBlocks)
          .where(eq(householdMemberBlocks.householdId, membership.household.id)),
        db
          .select()
          .from(shoppingListItems)
          .where(eq(shoppingListItems.householdId, membership.household.id)),
      ]);
      memberBlocks = blockRows.map((row) => ({
        ...row,
        scope: row.scope as HouseholdBlockScope,
      }));
      stateRows = shoppingRows;
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(householdMembers)
        .where(eq(householdMembers.householdId, membership.household.id));
      memberCount = Number(count);
    }

    const neededIngredients = new Map<string, NeededIngredient>();

    for (const mealPlan of mealPlansInRange) {
      const servingsMultiplier = mealPlan.servings || 1;
      // Blocking-aware scaling (packet decision 3/6): quantities scale
      // by the share of members still eating; a fully blocked slot
      // contributes nothing.
      const eaterScale = membership
        ? blockingScaleFactor(
            memberCount,
            blockedMembersForSlot(memberBlocks, mealPlan.date, mealPlan.mealType).length
          )
        : 1;
      if (eaterScale <= 0) continue;

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
          ? ingredient.quantity! * servingsMultiplier * eaterScale
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
      where: membership
        ? eq(inventory.householdId, membership.household.id)
        : and(eq(inventory.userId, currentUser.id), isNull(inventory.householdId)),
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
        catalogIngredientId: needed.catalogIngredientId,
      });
    }

    // Household mode: merge manual adds and annotate the shared tick
    // state. Already-moved rows are reported separately and never
    // re-enter the buy list.
    let movedItems: Array<{
      key: string;
      name: string;
      unit: string;
      quantity: number | null;
      movedByName: string | null;
      movedAt: string;
    }> = [];
    if (membership) {
      const actorIds = [
        ...new Set(
          stateRows
            .flatMap((row) => [row.tickedBy, row.movedBy])
            .filter((id): id is number => id != null)
        ),
      ];
      const actorRows = actorIds.length
        ? await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, actorIds))
        : [];
      const actorNames = new Map(actorRows.map((row) => [row.id, row.name]));

      const stateByKey = new Map(stateRows.map((row) => [row.itemKey, row]));

      for (const item of shoppingList) {
        const state = stateByKey.get(item.key);
        if (state?.tickedAt && !state.movedAt) {
          item.ticked = true;
          item.tickedByName = state.tickedBy != null ? actorNames.get(state.tickedBy) ?? null : null;
        }
      }

      for (const row of stateRows) {
        if (row.source !== "manual") continue;
        if (row.movedAt) continue; // moved manual items show in movedItems only
        // A generated item with the same key already covers this row;
        // its tick state was annotated above.
        if (neededIngredients.has(row.itemKey)) continue;
        shoppingList.push({
          key: row.itemKey,
          name: row.name,
          category: row.category,
          quantityNeeded: row.quantity,
          quantityOnHand: 0,
          quantityToBuy: row.quantity,
          quantityLabel: quantityLabel(row.quantity, row.unit),
          unit: row.unit,
          approximate: row.approximate,
          sourceMealCount: 0,
          catalogIngredientId: row.catalogIngredientId,
          ticked: Boolean(row.tickedAt),
          tickedByName: row.tickedBy != null ? actorNames.get(row.tickedBy) ?? null : null,
          manual: true,
        });
      }

      movedItems = stateRows
        .filter((row) => row.movedAt)
        .map((row) => ({
          key: row.itemKey,
          name: row.name,
          unit: row.unit,
          quantity: row.quantity,
          movedByName: row.movedBy != null ? actorNames.get(row.movedBy) ?? null : null,
          movedAt: row.movedAt!,
        }));
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
        household: membership ? true : false,
      },
      path: requestPath(request),
    });

    return NextResponse.json({
      items: shoppingList,
      movedItems,
      household: membership
        ? { id: membership.household.id, name: membership.household.name }
        : null,
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
