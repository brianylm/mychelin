import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canUserEditRecipe } from "@/lib/recipe-access";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";
import { ensureHouseholdSlice3Columns, ensureHouseholdTables } from "@/db/ensure-schema";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/recipes/[id]/household-share  { shared: boolean }
// Owner-only toggle. Sets shared_to_household_at/by so any member of a
// household the owner belongs to can read + ephemeral-cook the recipe.
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!HOUSEHOLDS_ENABLED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const recipeId = Number(id);
    const body = await request.json().catch(() => ({}));
    const shared = Boolean(body.shared);

    // Only the owner/editor may share — same gate as recipe edits.
    if (!(await canUserEditRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    await ensureHouseholdTables();
    await ensureHouseholdSlice3Columns();

    const membership = await getUserHousehold(currentUser.id);
    if (!membership) {
      return NextResponse.json(
        { error: "You need a household to share recipes with" },
        { status: 409 }
      );
    }

    const [recipe] = await db
      .select({ title: recipes.title })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    await db
      .update(recipes)
      .set({
        sharedToHouseholdAt: shared ? now : null,
        sharedToHouseholdBy: shared ? currentUser.id : null,
        updatedAt: now,
      })
      .where(eq(recipes.id, recipeId));

    await logHouseholdActivity(
      membership.household.id,
      currentUser.id,
      shared ? "shared_recipe" : "unshared_recipe",
      recipe.title
    );

    return NextResponse.json({ shared: !!shared });
  } catch (error) {
    console.error("POST /api/recipes/[id]/household-share error:", error);
    return NextResponse.json(
      { error: "Failed to update household share" },
      { status: 500 }
    );
  }
}
