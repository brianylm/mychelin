import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { recipeFlags } from "@/db/schema";
import { ensureRecipeFlagsTable } from "@/db/ensure-schema";
import { normalizeRecipeFlags, type RecipeFlag } from "@/lib/recipe-flags";

export async function getRecipeFlagsForUser(
  userId: number,
  recipeIds: number[]
): Promise<Map<number, RecipeFlag[]>> {
  await ensureRecipeFlagsTable();
  const uniqueIds = Array.from(new Set(recipeIds)).filter((id) => Number.isInteger(id));
  const result = new Map<number, RecipeFlag[]>();
  if (uniqueIds.length === 0) return result;

  const rows = await db
    .select({ recipeId: recipeFlags.recipeId, flag: recipeFlags.flag })
    .from(recipeFlags)
    .where(
      and(
        eq(recipeFlags.userId, userId),
        inArray(recipeFlags.recipeId, uniqueIds)
      )
    );

  for (const row of rows) {
    const current = result.get(row.recipeId) ?? [];
    const [flag] = normalizeRecipeFlags([row.flag]);
    if (flag && !current.includes(flag)) {
      current.push(flag);
      result.set(row.recipeId, current);
    }
  }

  return result;
}

export async function getRecipeFlagsForRecipe(
  userId: number,
  recipeId: number
): Promise<RecipeFlag[]> {
  const flagsByRecipe = await getRecipeFlagsForUser(userId, [recipeId]);
  return flagsByRecipe.get(recipeId) ?? [];
}

export async function replaceRecipeFlagsForUser(
  userId: number,
  recipeId: number,
  input: unknown
): Promise<RecipeFlag[]> {
  await ensureRecipeFlagsTable();
  const flags = normalizeRecipeFlags(input);

  await db
    .delete(recipeFlags)
    .where(and(eq(recipeFlags.userId, userId), eq(recipeFlags.recipeId, recipeId)));

  if (flags.length > 0) {
    const now = new Date().toISOString();
    await db.insert(recipeFlags).values(
      flags.map((flag) => ({
        recipeId,
        userId,
        flag,
        createdAt: now,
      }))
    );
  }

  return flags;
}
