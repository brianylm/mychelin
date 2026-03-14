import { NextRequest, NextResponse } from "next/server";
import { db, recipes, recipeVersions } from "@/db";
import { eq, desc } from "drizzle-orm";

// GET /api/recipes/[id] - Get a single recipe with its latest version
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: {
        versions: {
          orderBy: [desc(recipeVersions.versionNumber)],
          limit: 1,
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const latestVersion = recipe.versions[0];

    return NextResponse.json({
      ...recipe,
      ingredients: latestVersion?.ingredients || [],
      instructions: latestVersion?.instructions || [],
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 });
  }
}

// PUT /api/recipes/[id] - Update an existing recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // Check recipe exists
    const existing = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: {
        versions: {
          orderBy: [desc(recipeVersions.versionNumber)],
          limit: 1,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Update recipe fields
    await db
      .update(recipes)
      .set({
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
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, id));

    // Create a new version with updated ingredients/instructions
    const latestVersionNumber = existing.versions[0]?.versionNumber || 0;
    const versionId = crypto.randomUUID();

    await db.insert(recipeVersions).values({
      id: versionId,
      recipeId: id,
      versionNumber: latestVersionNumber + 1,
      ingredients: body.ingredients || [],
      instructions: body.instructions || [],
      notes: null,
      changedBy: "demo-user",
      changeNote: "Edited recipe",
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error updating recipe:", error);
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 });
  }
}
