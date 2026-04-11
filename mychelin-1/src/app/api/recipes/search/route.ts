import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, ingredients } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, like, inArray, desc, sql } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// GET /api/recipes/search?q=chicken
//
// Matches the query against recipe titles AND ingredient names, so
// typing "chicken" returns recipes called "Chicken Rice" as well as
// any recipe that has chicken in its ingredient list.
// Case-insensitive.
//
// NOTE on scoping: this intentionally does NOT filter by user_id.
// The existing POST /api/recipes route never sets user_id on new
// recipes (a separate bug), so every recipe in the DB has
// user_id = NULL and filtering by it returns zero rows. The main
// GET /api/recipes route is also unscoped today. Keeping search
// aligned with that behaviour so results actually show up. Once
// recipe ownership is tightened up across the app, this should
// also be scoped.
//
// Response shape:
//   {
//     results: [
//       {
//         recipe: { id, title, cuisine, imageUrl, ... },
//         matchedIngredient: "Chicken thigh" | null
//       }
//     ]
//   }
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (!q) {
      return NextResponse.json({ results: [] });
    }

    // SQLite LIKE isn't case-insensitive for non-ASCII by default, so
    // we LOWER() both sides. LOWER is a no-op on CJK glyphs, which is
    // fine — they match themselves regardless.
    const pattern = `%${q.toLowerCase()}%`;
    const lower = (col: unknown) => sql<string>`lower(${col})`;

    // 1. Find recipe ids whose title matches.
    const titleMatches = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(like(lower(recipes.title), pattern));

    // 2. Find ingredient rows whose name matches. Join through to
    //    recipes so we get the full recipe later; the join also
    //    filters out any orphaned ingredient rows.
    const ingredientMatches = await db
      .select({
        recipeId: ingredients.recipeId,
        ingredientName: ingredients.name,
      })
      .from(ingredients)
      .innerJoin(recipes, eq(recipes.id, ingredients.recipeId))
      .where(like(lower(ingredients.name), pattern));

    // 3. Merge ids. Record the first matching ingredient per recipe so
    //    the client can show "found in: ..." context.
    const idToIngredient = new Map<number, string>();
    for (const m of ingredientMatches) {
      if (!idToIngredient.has(m.recipeId)) {
        idToIngredient.set(m.recipeId, m.ingredientName);
      }
    }
    const allIds = new Set<number>([
      ...titleMatches.map((r) => r.id),
      ...idToIngredient.keys(),
    ]);

    if (allIds.size === 0) {
      return NextResponse.json({ results: [] });
    }

    // 4. Hydrate the matched recipes.
    const matchedRecipes = await db
      .select()
      .from(recipes)
      .where(inArray(recipes.id, Array.from(allIds)))
      .orderBy(desc(recipes.updatedAt));

    const results = matchedRecipes.map((r) => ({
      recipe: r,
      matchedIngredient: idToIngredient.get(r.id) ?? null,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("GET /api/recipes/search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
