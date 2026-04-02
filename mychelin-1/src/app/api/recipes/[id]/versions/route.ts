import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeVersions, recipes, ingredients, instructions } from "@/db/schema";
import { eq, desc, and, max } from "drizzle-orm";

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
      ingredients: v.ingredients ? JSON.parse(v.ingredients) : [],
      instructions: v.instructions ? JSON.parse(v.instructions) : [],
      photos: v.photos ? JSON.parse(v.photos) : [],
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

    // If no ingredients/instructions provided, try to snapshot current recipe state
    let ingredientsData = newIngredients;
    let instructionsData = newInstructions;

    if (!ingredientsData && !baseVersionId) {
      // Snapshot current recipe ingredients
      const currentIngredients = await db
        .select()
        .from(ingredients)
        .where(eq(ingredients.recipeId, recipeId));
      ingredientsData = currentIngredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
      }));
    }

    if (!instructionsData && !baseVersionId) {
      // Snapshot current recipe instructions
      const currentInstructions = await db
        .select()
        .from(instructions)
        .where(eq(instructions.recipeId, recipeId));
      instructionsData = currentInstructions.map((inst) => ({
        step: inst.stepNumber,
        content: inst.content,
        tip: inst.tip,
      }));
    }

    // If base version provided, fork from it
    if (baseVersionId && (!newIngredients || !newInstructions)) {
      const baseVersion = await db.query.recipeVersions.findFirst({
        where: eq(recipeVersions.id, baseVersionId),
      });
      if (baseVersion) {
        if (!newIngredients) {
          ingredientsData = baseVersion.ingredients
            ? JSON.parse(baseVersion.ingredients)
            : [];
        }
        if (!newInstructions) {
          instructionsData = baseVersion.instructions
            ? JSON.parse(baseVersion.instructions)
            : [];
        }
      }
    }

    const [newVersion] = await db
      .insert(recipeVersions)
      .values({
        recipeId,
        versionNumber: nextVersion,
        sourceVersionId: baseVersionId ?? null,
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
