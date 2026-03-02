import { NextRequest, NextResponse } from "next/server";
import { db, recipes, recipeVersions } from "@/db";
import { desc } from "drizzle-orm";

// GET /api/recipes - List all recipes
export async function GET() {
  const allRecipes = await db.query.recipes.findMany({
    orderBy: [desc(recipes.createdAt)],
    with: {
      versions: {
        orderBy: [desc(recipeVersions.versionNumber)],
        limit: 1,
      },
    },
  });

  return NextResponse.json(allRecipes);
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const recipeId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const userId = "demo-user"; // TODO: Replace with actual auth

    // Create recipe
    await db.insert(recipes).values({
      id: recipeId,
      title: body.title,
      description: body.description || null,
      story: body.story || null,
      origin: body.origin || null,
      familyMember: body.familyMember || null,
      cuisine: body.cuisine || null,
      category: body.category || null,
      prepTime: body.prepTime || null,
      cookTime: body.cookTime || null,
      servings: body.servings || null,
      difficulty: body.difficulty || null,
      createdBy: userId,
    });

    // Create initial version with ingredients and instructions
    await db.insert(recipeVersions).values({
      id: versionId,
      recipeId: recipeId,
      versionNumber: 1,
      ingredients: body.ingredients || [],
      instructions: body.instructions || [],
      notes: null,
      changedBy: userId,
      changeNote: "Initial version",
    });

    return NextResponse.json({ id: recipeId }, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe:", error);
    return NextResponse.json({ error: "Failed to create recipe" }, { status: 500 });
  }
}
