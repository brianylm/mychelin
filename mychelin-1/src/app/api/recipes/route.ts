import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, ingredients, instructions } from "@/db/schema";
import { eq } from "drizzle-orm";

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
            ing: { name: string; quantity?: number; unit?: string; notes?: string },
            idx: number
          ) => ({
            recipeId: newRecipe.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
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
