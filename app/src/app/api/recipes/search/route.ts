import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, ingredients } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { recipesVisibleTo } from "@/lib/recipe-access";
import { and, eq, inArray, desc, sql } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// GET /api/recipes/search?q=chicken
//
// Matches the query against recipe titles AND ingredient names, so
// typing "chicken" returns recipes called "Chicken Rice" as well as
// any recipe that has chicken in its ingredient list.
//
// Notes:
//  - Uses raw SQL LIKE. SQLite LIKE is case-insensitive for ASCII by
//    default (PRAGMA case_sensitive_like = OFF), so "broccoli" matches
//    "Broccoli" without any explicit LOWER() wrapping. We ALSO match
//    the lowercased query as a second pattern to handle any CJK or
//    case oddities.
//  - Scoped by access via recipesVisibleTo(): only matches recipes the
//    current user owns or has access to via book membership. This
//    matches the gating on GET /api/recipes.
//  - When ?debug=1 is passed, the response includes counts of rows
//    in the recipes / ingredients tables plus a sample of ingredient
//    names. Useful for diagnosing "search returns nothing" when the
//    ingredient table might be empty.
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const debug = searchParams.get("debug") === "1";
    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const pattern = `%${q}%`;
    const patternLower = `%${q.toLowerCase()}%`;

    const visible = recipesVisibleTo(user.id);

    // Title matches — raw SQL with two LIKE patterns (original + lower).
    const titleMatches = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(
        and(
          sql`${recipes.title} LIKE ${pattern} OR ${recipes.title} LIKE ${patternLower}`,
          visible
        )
      );

    // Ingredient matches. Join via recipe id for hydration later.
    const ingredientMatches = await db
      .select({
        recipeId: ingredients.recipeId,
        ingredientName: ingredients.name,
      })
      .from(ingredients)
      .innerJoin(recipes, eq(recipes.id, ingredients.recipeId))
      .where(
        and(
          sql`${ingredients.name} LIKE ${pattern} OR ${ingredients.name} LIKE ${patternLower}`,
          visible
        )
      );

    // Record the first matching ingredient per recipe for UI context.
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

    let debugPayload: Record<string, unknown> | undefined;
    if (debug || allIds.size === 0) {
      // Collect diagnostic info so we can tell whether the search is
      // broken or the underlying tables are actually empty / shaped
      // differently than we expect.
      const [ingCount] = await db
        .select({ n: sql<number>`count(*)` })
        .from(ingredients)
        .innerJoin(recipes, eq(recipes.id, ingredients.recipeId))
        .where(visible);
      const [recCount] = await db
        .select({ n: sql<number>`count(*)` })
        .from(recipes)
        .where(visible);
      const sampleIngredients = await db
        .select({ name: ingredients.name })
        .from(ingredients)
        .innerJoin(recipes, eq(recipes.id, ingredients.recipeId))
        .where(visible)
        .limit(20);
      debugPayload = {
        query: q,
        titleMatchCount: titleMatches.length,
        ingredientMatchCount: ingredientMatches.length,
        visibleIngredientsInDb: ingCount?.n ?? 0,
        visibleRecipesInDb: recCount?.n ?? 0,
        sampleIngredientNames: sampleIngredients.map((s) => s.name),
      };
    }

    if (allIds.size === 0) {
      return NextResponse.json({ results: [], debug: debugPayload });
    }

    const matchedRecipes = await db
      .select()
      .from(recipes)
      .where(and(inArray(recipes.id, Array.from(allIds)), visible))
      .orderBy(desc(recipes.updatedAt));

    const results = matchedRecipes.map((r) => ({
      recipe: r,
      matchedIngredient: idToIngredient.get(r.id) ?? null,
    }));

    return NextResponse.json({
      results,
      ...(debug ? { debug: debugPayload } : {}),
    });
  } catch (error) {
    console.error("GET /api/recipes/search error:", error);
    return NextResponse.json(
      { error: "Search failed", detail: String(error) },
      { status: 500 }
    );
  }
}
