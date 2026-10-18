import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ingredients, recipeDishTypes, recipes } from "@/db/schema";
import { ensureRecipeDishTypesTable } from "@/db/ensure-schema";
import { type DishType, effectiveDishTypes } from "@/lib/dish-type";

export interface RecipeDishTypes {
  dishTypes: DishType[];
  // True when the owner set them by hand rather than the rules.
  overridden: boolean;
}

// Effective dish types for many recipes in three queries (titles,
// ingredient names, overrides). Unknown ids are simply absent.
export async function dishTypesForRecipes(
  recipeIds: readonly number[]
): Promise<Map<number, RecipeDishTypes>> {
  const ids = [...new Set(recipeIds)].filter((id) => Number.isInteger(id));
  const result = new Map<number, RecipeDishTypes>();
  if (ids.length === 0) return result;
  await ensureRecipeDishTypesTable();

  const [titleRows, ingredientRows, overrideRows] = await Promise.all([
    db.select({ id: recipes.id, title: recipes.title }).from(recipes).where(inArray(recipes.id, ids)),
    db
      .select({ recipeId: ingredients.recipeId, name: ingredients.name })
      .from(ingredients)
      .where(inArray(ingredients.recipeId, ids)),
    db.select().from(recipeDishTypes).where(inArray(recipeDishTypes.recipeId, ids)),
  ]);

  const names = new Map<number, string[]>();
  for (const row of ingredientRows) {
    const list = names.get(row.recipeId) ?? [];
    list.push(row.name);
    names.set(row.recipeId, list);
  }
  const overrides = new Map(overrideRows.map((row) => [row.recipeId, row.dishTypes]));

  for (const row of titleRows) {
    const override = overrides.get(row.id);
    result.set(row.id, {
      dishTypes: effectiveDishTypes({
        title: row.title,
        ingredients: names.get(row.id) ?? [],
        override: override ?? null,
      }),
      overridden: override != null,
    });
  }
  return result;
}

// null clears the override so the rules decide again.
export async function setRecipeDishTypesOverride(
  recipeId: number,
  dishTypes: DishType[] | null
): Promise<void> {
  await ensureRecipeDishTypesTable();
  if (dishTypes === null) {
    await db.delete(recipeDishTypes).where(eq(recipeDishTypes.recipeId, recipeId));
    return;
  }
  const value = JSON.stringify(dishTypes);
  const now = new Date().toISOString();
  await db
    .insert(recipeDishTypes)
    .values({ recipeId, dishTypes: value, updatedAt: now })
    .onConflictDoUpdate({
      target: recipeDishTypes.recipeId,
      set: { dishTypes: value, updatedAt: now },
    });
}
