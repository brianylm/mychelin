import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { householdSharedRecipesWhere } from "@/lib/recipe-access";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";
import { ensureHouseholdSlice3Columns, ensureHouseholdTables } from "@/db/ensure-schema";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── GET /api/households/recipes ───────────────────────────
// Recipes shared to the user's household by any member. Read-only list for
// the household view; members open/import via per-recipe actions.
export async function GET() {
  try {
    if (!HOUSEHOLDS_ENABLED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureHouseholdTables();
    await ensureHouseholdSlice3Columns();

    const membership = await getUserHousehold(currentUser.id);
    if (!membership) {
      return NextResponse.json({ recipes: [] });
    }

    const rows = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        cuisine: recipes.cuisine,
        status: recipes.status,
        yield: recipes.yield,
        imageUrl: recipes.imageUrl,
        sharedToHouseholdAt: recipes.sharedToHouseholdAt,
        ownerId: recipes.userId,
        ownerName: users.name,
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.userId, users.id))
      .where(householdSharedRecipesWhere(currentUser.id))
      .orderBy(desc(recipes.sharedToHouseholdAt));

    return NextResponse.json({
      recipes: rows.map((recipe) => ({
        ...recipe,
        isOwner: recipe.ownerId === currentUser.id,
      })),
    });
  } catch (error) {
    console.error("GET /api/households/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch household recipes" },
      { status: 500 }
    );
  }
}

// ─── POST /api/households/recipes/share-all ────────────────
// One-time bulk action (confirmed in the UI): shares the owner's whole
// current library of active recipes to the household. Recipes created
// afterwards stay private until individually shared — nothing auto-shares.
export async function POST() {
  try {
    if (!HOUSEHOLDS_ENABLED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const mine = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(
        and(eq(recipes.userId, currentUser.id), eq(recipes.status, "active"))
      );

    const now = new Date().toISOString();
    if (mine.length > 0) {
      await db
        .update(recipes)
        .set({
          sharedToHouseholdAt: now,
          sharedToHouseholdBy: currentUser.id,
          updatedAt: now,
        })
        .where(
          and(eq(recipes.userId, currentUser.id), eq(recipes.status, "active"))
        );
    }

    await logHouseholdActivity(
      membership.household.id,
      currentUser.id,
      "shared_all_recipes",
      `${mine.length} recipe${mine.length === 1 ? "" : "s"}`
    );

    return NextResponse.json({ count: mine.length });
  } catch (error) {
    console.error("POST /api/households/recipes/share-all error:", error);
    return NextResponse.json(
      { error: "Failed to share recipes" },
      { status: 500 }
    );
  }
}
