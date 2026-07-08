// Recipe access helpers — server-side gate for "which recipes can this
// user see / mutate?". A recipe is accessible to a user if EITHER:
//   1. the recipe's user_id matches the user (direct ownership), OR
//   2. the recipe is in a book the user is a member of
//
// History note: until the multi-user fix, POST /api/recipes never set
// user_id, so every recipe in the DB has user_id IS NULL. After the fix,
// new recipes get a real owner — but the existing rows still need to be
// claimed by the original user. ensureRecipeOwnershipBackfill() runs
// once per process and assigns every NULL row to the lowest user id
// (the only user who existed before the new sign-up that surfaced the
// bug, so this is safe).

import { db } from "@/db";
import { recipes, bookMembers, users } from "@/db/schema";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

let backfillRan = false;

export async function ensureRecipeOwnershipBackfill(): Promise<void> {
  if (backfillRan) return;
  // Tag as ran upfront so concurrent requests don't pile on the same
  // backfill. If this attempt errors below, subsequent requests will
  // still not retry — that's fine, the work is idempotent and a follow-
  // up deploy / restart will try again.
  backfillRan = true;

  try {
    const [orphan] = await db
      .select({ n: sql<number>`count(*)` })
      .from(recipes)
      .where(isNull(recipes.userId));

    if (!orphan || Number(orphan.n) === 0) return;

    const [firstUser] = await db
      .select({ id: users.id })
      .from(users)
      .orderBy(users.id)
      .limit(1);

    if (!firstUser) return;

    await db
      .update(recipes)
      .set({ userId: firstUser.id })
      .where(isNull(recipes.userId));
  } catch (err) {
    // Don't block requests on a backfill failure. Reset the flag so a
    // later request can retry.
    backfillRan = false;
    console.warn("ensureRecipeOwnershipBackfill failed:", err);
  }
}

// Returns the SQL predicate that matches recipes the given user can
// see. Use it as the `where` clause of a recipes query.
export function recipesVisibleTo(userId: number): SQL {
  // Subquery: book ids the user is a member of.
  const memberBookIds = db
    .select({ bookId: bookMembers.bookId })
    .from(bookMembers)
    .where(eq(bookMembers.userId, userId));

  return or(
    eq(recipes.userId, userId),
    inArray(recipes.bookId, memberBookIds)
  )!;
}

// Returns true iff the user can read the given recipe. Used by item
// routes (GET/PATCH/PUT/DELETE /api/recipes/[id]) for an authorization
// check before responding.
export async function canUserAccessRecipe(
  userId: number,
  recipeId: number
): Promise<boolean> {
  const [row] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), recipesVisibleTo(userId)))
    .limit(1);
  return !!row;
}

export async function canUserEditRecipe(
  userId: number,
  recipeId: number
): Promise<boolean> {
  const editableBookIds = db
    .select({ bookId: bookMembers.bookId })
    .from(bookMembers)
    .where(
      and(
        eq(bookMembers.userId, userId),
        inArray(bookMembers.role, ["owner", "editor"])
      )
    );

  const [row] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(
      and(
        eq(recipes.id, recipeId),
        or(eq(recipes.userId, userId), inArray(recipes.bookId, editableBookIds))
      )
    )
    .limit(1);

  return !!row;
}
