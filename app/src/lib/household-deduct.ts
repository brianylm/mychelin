// Cook-time deduction proposal (Slice 2). Builds the "used: chicken
// 500g, rice 2 cups" proposal shown when a Cook With Me session finishes
// for a meal on the household plan. DB-touching; the math lives in
// household-inventory.ts / household-portions.ts.
//
// Trap check (packet): the proposal only fires when the cooked recipe
// belongs to the cook AND the meal is on their household's plan.
// Ephemeral cooks of other members' recipes are a Slice 3 flow — no
// proposal, no deduction.

import { db } from "@/db";
import {
  householdMemberBlocks,
  householdMembers,
  inventory,
  mealPlans,
  recipes,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { getUserHousehold } from "@/lib/households";
import {
  blockedMembersForSlot,
  type HouseholdBlockScope,
} from "@/lib/household-blocking";
import { blockingScaleFactor } from "@/lib/household-portions";
import {
  computeDeductionItems,
  matchInventoryRow,
  type DeductionSource,
} from "@/lib/household-inventory";

export interface DeductionProposalItem {
  name: string;
  unit: string;
  quantity: number;
  catalogIngredientId: number | null;
  onHand: number | null; // current shared stock of the matched row, null = untracked
}

export interface DeductionProposal {
  mealPlanId: number;
  items: DeductionProposalItem[];
  notTracked: string[];
}

export async function buildDeductionProposal(
  userId: number,
  mealPlanId: number,
  // What the cook actually used (session snapshot); falls back to the
  // recipe's stored ingredients when the snapshot is missing.
  sessionIngredients: DeductionSource[] | null
): Promise<DeductionProposal | null> {
  if (!HOUSEHOLDS_ENABLED) return null;
  const membership = await getUserHousehold(userId);
  if (!membership) return null;
  const householdId = membership.household.id;

  const [plan] = await db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.id, mealPlanId), eq(mealPlans.householdId, householdId)))
    .limit(1);
  if (!plan) return null;

  const [recipe] = await db
    .select({ userId: recipes.userId })
    .from(recipes)
    .where(eq(recipes.id, plan.recipeId))
    .limit(1);
  // The cook must own the recipe — see the trap-check note above.
  if (!recipe || recipe.userId !== userId) return null;

  // Blocking-aware scale: deduct for the members actually eating.
  const [blockRows, memberCountRow, recipeIngredients, inventoryRows] =
    await Promise.all([
      db
        .select({
          id: householdMemberBlocks.id,
          userId: householdMemberBlocks.userId,
          scope: householdMemberBlocks.scope,
          date: householdMemberBlocks.date,
          mealType: householdMemberBlocks.mealType,
        })
        .from(householdMemberBlocks)
        .where(eq(householdMemberBlocks.householdId, householdId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(householdMembers)
        .where(eq(householdMembers.householdId, householdId)),
      sessionIngredients && sessionIngredients.length > 0
        ? Promise.resolve(null)
        : db.query.ingredients.findMany({
            where: (ing, { eq: eqOp }) => eqOp(ing.recipeId, plan.recipeId),
            columns: {
              name: true,
              quantity: true,
              unit: true,
              approximate: true,
              catalogIngredientId: true,
            },
          }),
      db
        .select({
          id: inventory.id,
          name: inventory.name,
          unit: inventory.unit,
          quantity: inventory.quantity,
          catalogIngredientId: inventory.catalogIngredientId,
        })
        .from(inventory)
        .where(eq(inventory.householdId, householdId)),
    ]);

  const memberCount = Number(memberCountRow[0]?.count ?? 0);
  const blockedCount = blockedMembersForSlot(
    blockRows.map((row) => ({ ...row, scope: row.scope as HouseholdBlockScope })),
    plan.date,
    plan.mealType
  ).length;
  const scale = blockingScaleFactor(memberCount, blockedCount);

  const source: DeductionSource[] =
    sessionIngredients && sessionIngredients.length > 0
      ? sessionIngredients
      : (recipeIngredients ?? []);

  const { items, untracked } = computeDeductionItems(source, plan.servings, scale);

  return {
    mealPlanId,
    items: items.map((item) => {
      const match = matchInventoryRow(item, inventoryRows);
      return { ...item, onHand: match ? match.quantity : null };
    }),
    // Approximate quantities can't be deducted; anything unmatched
    // against shared inventory joins them as "not tracked".
    notTracked: [
      ...untracked,
      ...items
        .filter((item) => !matchInventoryRow(item, inventoryRows))
        .map((item) => item.name),
    ],
  };
}
