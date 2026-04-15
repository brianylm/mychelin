import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, ingredients, instructions, recipeVersions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";
import { eq, desc } from "drizzle-orm";
import { ensureVersionLabelColumn } from "@/db/ensure-schema";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ recipeId: string }> };

// ─── POST /api/recipes/[recipeId]/fork ─────────────────────
// Fork a recipe — copies recipe + ingredients + instructions to a new recipe
// and creates its initial version labeled as "{parentLabel}.{forkIndex}".
// e.g. forking v1 produces a new recipe whose first version is labeled "1.1".
export async function POST(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    await ensureVersionLabelColumn();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await params;
    const recipeIdNum = parseInt(recipeId);

    if (!(await canUserAccessRecipe(currentUser.id, recipeIdNum))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Fetch original recipe with ingredients and instructions
    const original = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeIdNum),
      with: {
        ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
        instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Resolve the source version — use the recipe's active version if set,
    // otherwise fall back to the latest version. If the original recipe has
    // no versions at all (existing pre-v1 recipe), create v1 on the fly from
    // its current ingredients/instructions so the fork graph stays intact.
    let sourceVersion = original.activeVersionId
      ? await db.query.recipeVersions.findFirst({
          where: eq(recipeVersions.id, original.activeVersionId),
        })
      : null;

    if (!sourceVersion) {
      const [latest] = await db
        .select()
        .from(recipeVersions)
        .where(eq(recipeVersions.recipeId, recipeIdNum))
        .orderBy(desc(recipeVersions.versionNumber))
        .limit(1);
      sourceVersion = latest ?? null;
    }

    if (!sourceVersion) {
      // Backfill v1 for the original recipe using its current state.
      const [backfilled] = await db
        .insert(recipeVersions)
        .values({
          recipeId: recipeIdNum,
          versionNumber: 1,
          versionLabel: "1",
          captureMethod: "manual",
          ingredients: JSON.stringify(
            original.ingredients.map((ing) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              approximate: ing.approximate,
              quantityText: ing.quantityText,
              notes: ing.notes,
            }))
          ),
          instructions: JSON.stringify(
            original.instructions.map((inst) => ({
              content: inst.content,
              tip: inst.tip,
              imageUrl: inst.imageUrl,
            }))
          ),
          changedBy: original.userId ?? currentUser.id,
          changeNote: "Initial version (backfilled on fork)",
        })
        .returning();

      // Point the original recipe at its new v1
      await db
        .update(recipes)
        .set({ activeVersionId: backfilled.id })
        .where(eq(recipes.id, recipeIdNum));

      sourceVersion = backfilled;
    }

    // Determine the new fork's version label by counting existing forks of
    // the same source version. e.g. first fork of v1 → "1.1", second → "1.2".
    const parentLabel = sourceVersion.versionLabel ?? String(sourceVersion.versionNumber);
    const siblings = await db
      .select({ id: recipeVersions.id })
      .from(recipeVersions)
      .where(eq(recipeVersions.sourceVersionId, sourceVersion.id));
    const forkIndex = siblings.length + 1;
    const newLabel = `${parentLabel}.${forkIndex}`;

    const now = new Date().toISOString();

    // Insert forked recipe — include the version label in the title so the
    // fork is obviously distinguishable (e.g. "Pad Thai v1.1").
    const [forkedRecipe] = await db
      .insert(recipes)
      .values({
        userId: currentUser.id,
        title: `${original.title} v${newLabel}`,
        description: original.description,
        cuisine: original.cuisine,
        yield: original.yield,
        prepTime: original.prepTime,
        cookTime: original.cookTime,
        story: original.story,
        imageUrl: original.imageUrl,
        isPublic: false,
        origin: original.origin,
        dialect: original.dialect,
        occasion: original.occasion,
        familyMember: original.familyMember,
        generation: original.generation,
        forkedFrom: String(original.id),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Copy ingredients
    if (original.ingredients.length > 0) {
      await db.insert(ingredients).values(
        original.ingredients.map((ing) => ({
          recipeId: forkedRecipe.id,
          catalogIngredientId: ing.catalogIngredientId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          approximate: ing.approximate,
          quantityText: ing.quantityText,
          notes: ing.notes,
          sortOrder: ing.sortOrder,
        }))
      );
    }

    // Copy instructions
    if (original.instructions.length > 0) {
      await db.insert(instructions).values(
        original.instructions.map((inst) => ({
          recipeId: forkedRecipe.id,
          stepNumber: inst.stepNumber,
          content: inst.content,
          tip: inst.tip,
          imageUrl: inst.imageUrl,
        }))
      );
    }

    // Create the forked recipe's first version. Version 1 of the new recipe
    // carries the dotted label and points back to the source version.
    const [newVersion] = await db
      .insert(recipeVersions)
      .values({
        recipeId: forkedRecipe.id,
        versionNumber: 1,
        versionLabel: newLabel,
        sourceVersionId: sourceVersion?.id ?? null,
        captureMethod: "manual",
        ingredients: JSON.stringify(
          original.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            approximate: ing.approximate,
            quantityText: ing.quantityText,
            notes: ing.notes,
          }))
        ),
        instructions: JSON.stringify(
          original.instructions.map((inst) => ({
            content: inst.content,
            tip: inst.tip,
            imageUrl: inst.imageUrl,
          }))
        ),
        changedBy: currentUser.id,
        changeNote: `Forked from v${sourceVersion?.versionLabel ?? sourceVersion?.versionNumber ?? "?"}`,
      })
      .returning();

    // Set as active version on the new recipe
    await db
      .update(recipes)
      .set({ activeVersionId: newVersion.id })
      .where(eq(recipes.id, forkedRecipe.id));

    return NextResponse.json(
      { ...forkedRecipe, activeVersionId: newVersion.id, versionLabel: newLabel },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/recipes/[recipeId]/fork error:", error);
    return NextResponse.json({ error: "Failed to fork recipe" }, { status: 500 });
  }
}
