import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, ingredients, instructions, recipeVersions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureVersionLabelColumn } from "@/db/ensure-schema";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── GET /api/recipes ──────────────────────────────────────
// Returns all recipes with their ingredients and instructions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Single recipe with relations
      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, Number(id)),
        with: {
          ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
          instructions: {
            orderBy: (inst, { asc }) => [asc(inst.stepNumber)],
          },
        },
      });

      if (!recipe) {
        return NextResponse.json(
          { error: "Recipe not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(recipe);
    }

    // All recipes (without nested relations for list view)
    const allRecipes = await db.query.recipes.findMany({
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });

    return NextResponse.json(allRecipes);
  } catch (error) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

// ─── POST /api/recipes ─────────────────────────────────────
// Creates a new recipe with optional ingredients and instructions
export async function POST(request: NextRequest) {
  try {
    await ensureVersionLabelColumn();
    const body = await request.json();
    const {
      title,
      description,
      cuisine,
      yield: recipeYield,
      prepTime,
      cookTime,
      story,
      imageUrl,
      isPublic,
      bookId,
      ingredients: ingredientsList,
      instructions: instructionsList,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Insert recipe
    const [newRecipe] = await db
      .insert(recipes)
      .values({
        title,
        description,
        cuisine,
        yield: recipeYield,
        prepTime,
        cookTime,
        story,
        imageUrl,
        isPublic: isPublic ?? false,
        bookId: bookId ?? null,
      })
      .returning();

    // Insert ingredients if provided
    if (ingredientsList?.length) {
      await db.insert(ingredients).values(
        ingredientsList.map(
          (
            ing: {
              name: string;
              quantity?: number;
              unit?: string;
              approximate?: boolean;
              quantityText?: string;
              notes?: string;
            },
            idx: number
          ) => ({
            recipeId: newRecipe.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            approximate: Boolean(ing.approximate),
            quantityText: ing.quantityText ?? null,
            notes: ing.notes,
            sortOrder: idx,
          })
        )
      );
    }

    // Insert instructions if provided
    if (instructionsList?.length) {
      await db.insert(instructions).values(
        instructionsList.map(
          (
            inst: { content: string; tip?: string; imageUrl?: string },
            idx: number
          ) => ({
            recipeId: newRecipe.id,
            stepNumber: idx + 1,
            content: inst.content,
            tip: inst.tip,
            imageUrl: inst.imageUrl,
          })
        )
      );
    }

    // Auto-create version 1 — this is what cook-along uses
    const [v1] = await db
      .insert(recipeVersions)
      .values({
        recipeId: newRecipe.id,
        versionNumber: 1,
        versionLabel: "1",
        captureMethod: "manual",
        ingredients: ingredientsList ? JSON.stringify(ingredientsList) : JSON.stringify([]),
        instructions: instructionsList ? JSON.stringify(instructionsList) : JSON.stringify([]),
        changeNote: "Initial version",
      })
      .returning();

    // Point the recipe's activeVersionId at v1
    await db
      .update(recipes)
      .set({ activeVersionId: v1.id })
      .where(eq(recipes.id, newRecipe.id));

    // Return complete recipe
    const fullRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, newRecipe.id),
      with: {
        ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
        instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
      },
    });

    return NextResponse.json(fullRecipe, { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
