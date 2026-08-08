import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canReadHouseholdSharedRecipe } from "@/lib/recipe-access";
import { forkRecipeToUser } from "@/lib/recipe-fork";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";
import { ensureHouseholdSlice3Columns, ensureHouseholdTables } from "@/db/ensure-schema";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/households/recipes/[id]/import
// Fork a household-shared recipe into the requesting member's own library.
// The copy carries `forked_from` lineage; attempts, next-tries, comments,
// and ratings live on the copy from here on.
export async function POST(_request: NextRequest, context: RouteContext) {
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

    await ensureHouseholdTables();
    await ensureHouseholdSlice3Columns();

    const membership = await getUserHousehold(currentUser.id);
    if (!membership) {
      return NextResponse.json(
        { error: "You need a household to import recipes" },
        { status: 409 }
      );
    }

    // Must be a household-shared read (not the owner's own recipe).
    if (!(await canReadHouseholdSharedRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const [source] = await db
      .select({ userId: recipes.userId })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);
    if (!source) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    if (source.userId === currentUser.id) {
      return NextResponse.json(
        { error: "This is already your recipe" },
        { status: 409 }
      );
    }

    const saved = await forkRecipeToUser(currentUser.id, recipeId);
    if (!saved) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    await logHouseholdActivity(
      membership.household.id,
      currentUser.id,
      "imported_recipe",
      saved.title
    );

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("POST /api/households/recipes/[id]/import error:", error);
    return NextResponse.json(
      { error: "Failed to import recipe" },
      { status: 500 }
    );
  }
}
