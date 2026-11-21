import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { householdMemberBlocks, mealPlanBlocks, mealPlans, recipes } from "@/db/schema";
import { canUserAccessRecipe } from "@/lib/recipe-access";
import { logHouseholdActivity } from "@/lib/households";
import { trackUsageEvent } from "@/lib/usage-events";

export const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Activity-feed target for batch plan changes ("12 meals").
export function mealsLabel(count: number): string {
  return `${count} meal${count === 1 ? "" : "s"}`;
}

export interface MealPlanInput {
  date: unknown;
  mealType: unknown;
  recipeId: unknown;
  servings?: unknown;
  notes?: unknown;
}

export type MealPlanInputError = { error: string; status: 400 | 404 };

export function validateMealPlanInput(input: MealPlanInput): MealPlanInputError | null {
  const { date, mealType, recipeId } = input;
  if (!date) return { error: "Date is required", status: 400 };
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return { error: "Invalid date format. Use YYYY-MM-DD", status: 400 };
  }
  if (!mealType) return { error: "Meal type is required", status: 400 };
  if (typeof mealType !== "string" || !VALID_MEAL_TYPES.includes(mealType)) {
    return {
      error: "Invalid meal type. Must be one of: breakfast, lunch, dinner, snack",
      status: 400,
    };
  }
  if (!recipeId) return { error: "Recipe ID is required", status: 400 };
  return null;
}

// Creates one plan row for the caller: on the household's shared plan when
// they are in one (userId records who added it), otherwise personal. Lifts
// the matching slot block. `logActivity: false` is only for callers that
// write their own summary entry to the household feed (the randomize roll).
export async function createMealPlanForUser(params: {
  user: { id: number; name: string | null };
  householdId: number | null;
  input: MealPlanInput;
  path: string | null;
  source: string;
  logActivity: boolean;
}): Promise<MealPlanInputError | { plan: Record<string, unknown> }> {
  const { user, householdId, input, path, source, logActivity } = params;
  const invalid = validateMealPlanInput(input);
  if (invalid) return invalid;
  const date = input.date as string;
  const mealType = input.mealType as string;
  const servings = input.servings;
  const notes = input.notes as string | undefined;

  // Planner pickers stay scoped to the user's own library (plus book
  // access) — household recipes enter someone else's plan via import,
  // not direct selection (Slice 2).
  const recipeIdNumber = Number(input.recipeId);
  if (!(await canUserAccessRecipe(user.id, recipeIdNumber))) {
    return { error: "Recipe not found", status: 404 };
  }

  const [newPlan] = await db
    .insert(mealPlans)
    .values({
      userId: user.id,
      householdId,
      date,
      mealType,
      recipeId: recipeIdNumber,
      servings: (servings as number) || 1,
      notes,
    })
    .returning();

  const [recipeSummary] = await db
    .select({ id: recipes.id, title: recipes.title, yield: recipes.yield })
    .from(recipes)
    .where(eq(recipes.id, recipeIdNumber))
    .limit(1);

  if (householdId != null) {
    // Planning a meal lifts the member's own slot-scope block, if any.
    // Day/week/month blocks stay — they are deliberate absences.
    await db
      .delete(householdMemberBlocks)
      .where(
        and(
          eq(householdMemberBlocks.householdId, householdId),
          eq(householdMemberBlocks.userId, user.id),
          eq(householdMemberBlocks.scope, "slot"),
          eq(householdMemberBlocks.date, date),
          eq(householdMemberBlocks.mealType, mealType)
        )
      );

    if (logActivity) {
      await logHouseholdActivity(householdId, user.id, "added_meal", recipeSummary?.title ?? null);
    }
  } else {
    // Planning a meal in a blocked slot lifts the block.
    await db
      .delete(mealPlanBlocks)
      .where(
        and(
          eq(mealPlanBlocks.userId, user.id),
          eq(mealPlanBlocks.date, date),
          eq(mealPlanBlocks.mealType, mealType)
        )
      );
  }

  // Build the response from the inserted row instead of immediately
  // re-reading it. A just-written row can occasionally be absent from a
  // follow-up remote read, and serializing that undefined value turns an
  // otherwise successful insert into a 500 response.
  const fullPlan = { ...newPlan, recipe: recipeSummary ?? null };

  await trackUsageEvent({
    userId: user.id,
    eventName: "meal_planned",
    source,
    recipeId: recipeIdNumber,
    mealPlanId: newPlan.id,
    properties: {
      meal_type: mealType,
      servings: Number(servings || 1),
      has_notes: Boolean(notes),
      household: householdId != null,
    },
    path,
  });

  return {
    plan: householdId != null ? { ...fullPlan, addedByName: user.name } : fullPlan,
  };
}
