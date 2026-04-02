import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeVersions, recipes } from "@/db/schema";
import { eq, desc, max } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/recipes/:id/versions ─────────────────────────
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recipeId = Number(id);

    const versions = await db
      .select()
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId))
      .orderBy(desc(recipeVersions.versionNumber));

    // Parse JSON fields
    const parsed = versions.map((v) => ({
      ...v,
      ingredients: v.ingredients ? JSON.parse(v.ingredients as string) : [],
      instructions: v.instructions ? JSON.parse(v.instructions as string) : [],
      photos: v.photos ? JSON.parse(v.photos as string) : [],
    }));

    // Get the recipe's active version id
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      columns: { activeVersionId: true },
    });

    return NextResponse.json({
      versions: parsed,
      activeVersionId: recipe?.activeVersionId ?? null,
    });
  } catch (error) {
    console.error("GET /api/recipes/[id]/versions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}

// ─── POST /api/recipes/:id/versions ────────────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recipeId = Number(id);
    const body = await request.json();

    const {
      baseVersionId,
      captureMethod = "manual",
      ingredients: newIngredients,
      instructions: newInstructions,
      notes,
      changeNote,
      closenessRating,
      closenessNotes,
      cookingSessionDate,
      photos,
      setActive = false,
    } = body;

    // Get next version number
    const maxResult = await db
      .select({ maxVer: max(recipeVersions.versionNumber) })
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId));

    const nextVersion = (maxResult[0]?.maxVer ?? 0) + 1;

    // Resolve ingredients/instructions from base version if not provided
    let ingredientsData = newIngredients;
    let instructionsData = newInstructions;

    if (baseVersionId && (!newIngredients || !newInstructions)) {
      const baseVersion = await db.query.recipeVersions.findFirst({
        where: eq(recipeVersions.id, Number(baseVersionId)),
      });
      if (baseVersion) {
        if (!newIngredients) {
          ingredientsData = baseVersion.ingredients
            ? JSON.parse(baseVersion.ingredients as string)
            : [];
        }
        if (!newInstructions) {
          instructionsData = baseVersion.instructions
            ? JSON.parse(baseVersion.instructions as string)
            : [];
        }
      }
    } else if (!newIngredients || !newInstructions) {
      // Fork from latest version
      const latest = await db
        .select()
        .from(recipeVersions)
        .where(eq(recipeVersions.recipeId, recipeId))
        .orderBy(desc(recipeVersions.versionNumber))
        .limit(1);

      if (latest[0]) {
        if (!newIngredients) {
          ingredientsData = latest[0].ingredients
            ? JSON.parse(latest[0].ingredients as string)
            : [];
        }
        if (!newInstructions) {
          instructionsData = latest[0].instructions
            ? JSON.parse(latest[0].instructions as string)
            : [];
        }
      }
    }

    const [newVersion] = await db
      .insert(recipeVersions)
      .values({
        recipeId,
        versionNumber: nextVersion,
        sourceVersionId: baseVersionId ? Number(baseVersionId) : null,
        captureMethod,
        ingredients: ingredientsData ? JSON.stringify(ingredientsData) : null,
        instructions: instructionsData ? JSON.stringify(instructionsData) : null,
        notes: notes ?? null,
        changeNote: changeNote ?? null,
        closenessRating: closenessRating ?? null,
        closenessNotes: closenessNotes ?? null,
        cookingSessionDate: cookingSessionDate ?? null,
        photos: photos ? JSON.stringify(photos) : null,
      })
      .returning();

    // Set as active version if requested
    if (setActive) {
      await db
        .update(recipes)
        .set({ activeVersionId: newVersion.id })
        .where(eq(recipes.id, recipeId));
    }

    return NextResponse.json({
      ...newVersion,
      ingredients: ingredientsData ?? [],
      instructions: instructionsData ?? [],
      photos: photos ?? [],
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes/[id]/versions error:", error);
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    );
  }
}
