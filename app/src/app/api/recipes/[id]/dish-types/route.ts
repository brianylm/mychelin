import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUserEditRecipe, canUserReadRecipe } from "@/lib/recipe-access";
import { DISH_TYPES, type DishType } from "@/lib/dish-type";
import { dishTypesForRecipes, setRecipeDishTypesOverride } from "@/lib/dish-type-store";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/recipes/[id]/dish-types -> { dishTypes, overridden }
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const recipeId = Number((await context.params).id);
    if (!Number.isInteger(recipeId) || !(await canUserReadRecipe(user.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    const found = (await dishTypesForRecipes([recipeId])).get(recipeId);
    return NextResponse.json(found ?? { dishTypes: [], overridden: false });
  } catch (error) {
    console.error("GET /api/recipes/[id]/dish-types error:", error);
    return NextResponse.json({ error: "Failed to load dish types" }, { status: 500 });
  }
}

// PUT /api/recipes/[id]/dish-types  { dishTypes: DishType[] | null }
// Owner/editor only. null goes back to the automatic types.
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const recipeId = Number((await context.params).id);
    if (!Number.isInteger(recipeId) || !(await canUserEditRecipe(user.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => null)) as { dishTypes?: unknown } | null;
    const raw = body?.dishTypes;
    let next: DishType[] | null;
    if (raw === null) {
      next = null;
    } else if (
      Array.isArray(raw) &&
      raw.every((t) => typeof t === "string" && (DISH_TYPES as readonly string[]).includes(t))
    ) {
      next = [...new Set(raw as DishType[])];
    } else {
      return NextResponse.json(
        { error: `dishTypes must be null or a list of: ${DISH_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    await setRecipeDishTypesOverride(recipeId, next);
    const found = (await dishTypesForRecipes([recipeId])).get(recipeId);
    return NextResponse.json(found ?? { dishTypes: [], overridden: false });
  } catch (error) {
    console.error("PUT /api/recipes/[id]/dish-types error:", error);
    return NextResponse.json({ error: "Failed to save dish types" }, { status: 500 });
  }
}
