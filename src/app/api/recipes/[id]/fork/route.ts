import { NextRequest, NextResponse } from "next/server";
import { db, recipes, recipeVersions, bookMembers } from "@/db";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

// POST /api/recipes/[id]/fork — fork a recipe into the current user's space
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch original recipe + latest version
    const original = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: {
        versions: {
          orderBy: [desc(recipeVersions.versionNumber)],
          limit: 1,
        },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const latestVersion = original.versions[0];

    // Parse optional bookId from request body
    let bookId: string | null = null;
    try {
      const body = await request.json();
      if (body?.bookId) {
        // Validate user is a member of the book
        const membership = await db.query.bookMembers.findFirst({
          where: and(
            eq(bookMembers.bookId, body.bookId),
            eq(bookMembers.userId, userId)
          ),
        });
        if (!membership) {
          return NextResponse.json(
            { error: "You are not a member of that recipe book" },
            { status: 403 }
          );
        }
        bookId = body.bookId;
      }
    } catch {
      // No body or invalid JSON — that's fine, bookId stays null
    }

    // Create the forked recipe
    const newRecipeId = crypto.randomUUID();
    await db.insert(recipes).values({
      id: newRecipeId,
      bookId,
      title: original.title,
      description: original.description,
      imageUrl: original.imageUrl,
      story: original.story,
      origin: original.origin,
      familyMember: original.familyMember,
      cuisine: original.cuisine,
      category: original.category,
      tags: original.tags,
      prepTime: original.prepTime,
      cookTime: original.cookTime,
      servings: original.servings,
      difficulty: original.difficulty,
      createdBy: userId,
      forkedFrom: original.id,
    });

    // Create version 1 with the forked ingredients + instructions
    const newVersionId = crypto.randomUUID();
    await db.insert(recipeVersions).values({
      id: newVersionId,
      recipeId: newRecipeId,
      versionNumber: 1,
      ingredients: latestVersion?.ingredients ?? [],
      instructions: latestVersion?.instructions ?? [],
      notes: latestVersion?.notes ?? null,
      changedBy: userId,
      changeNote: `Forked from ${original.title}`,
    });

    return NextResponse.json({ id: newRecipeId });
  } catch (error) {
    console.error("Error forking recipe:", error);
    return NextResponse.json({ error: "Failed to fork recipe" }, { status: 500 });
  }
}
