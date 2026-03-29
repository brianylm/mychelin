import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookMembers, bookRecipes, bookActivityLog, recipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// ─── GET /api/books/[id]/recipes ──────────────────────────
// List recipes in a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const bookId = parseInt(id);

    // Check membership
    const membership = await db
      .select()
      .from(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookId),
        eq(bookMembers.userId, currentUser.id)
      ))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get recipes in this book (via direct bookId on recipes table)
    const result = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        cuisine: recipes.cuisine,
        imageUrl: recipes.imageUrl,
      })
      .from(recipes)
      .where(eq(recipes.bookId, bookId))
      .orderBy(recipes.title);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/books/[id]/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch book recipes" },
      { status: 500 }
    );
  }
}

// ─── POST /api/books/[id]/recipes ─────────────────────────
// Add a recipe to the book
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const bookId = parseInt(id);
    const { recipeId } = await request.json();

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    // Check if user has editor or owner role
    const membership = await db
      .select()
      .from(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookId),
        eq(bookMembers.userId, currentUser.id)
      ))
      .limit(1);

    if (!membership.length || (membership[0].role !== "owner" && membership[0].role !== "editor")) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if recipe exists
    const recipe = await db
      .select({ title: recipes.title })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipe.length) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Check if recipe is already in the book
    const existing = await db
      .select()
      .from(bookRecipes)
      .where(and(
        eq(bookRecipes.bookId, bookId),
        eq(bookRecipes.recipeId, recipeId)
      ))
      .limit(1);

    if (existing.length) {
      return NextResponse.json(
        { error: "Recipe is already in this book" },
        { status: 409 }
      );
    }

    // Get the highest sort order for this book
    const highestSort = await db
      .select({ sortOrder: bookRecipes.sortOrder })
      .from(bookRecipes)
      .where(eq(bookRecipes.bookId, bookId))
      .orderBy(bookRecipes.sortOrder)
      .limit(1);

    const nextSortOrder = highestSort.length && highestSort[0]?.sortOrder !== null 
      ? highestSort[0].sortOrder + 1 
      : 0;

    // Add recipe to book
    const [newBookRecipe] = await db
      .insert(bookRecipes)
      .values({
        bookId,
        recipeId,
        addedBy: currentUser.id,
        sortOrder: nextSortOrder,
      })
      .returning();

    // Log the activity
    await db
      .insert(bookActivityLog)
      .values({
        bookId,
        userId: currentUser.id,
        action: "added_recipe",
        targetName: recipe[0].title,
      });

    return NextResponse.json(newBookRecipe, { status: 201 });
  } catch (error) {
    console.error("POST /api/books/[id]/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to add recipe to book" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/books/[id]/recipes ────────────────────────
// Remove a recipe from the book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const bookId = parseInt(id);
    const { recipeId } = await request.json();

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    // Check if user has editor or owner role
    const membership = await db
      .select()
      .from(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookId),
        eq(bookMembers.userId, currentUser.id)
      ))
      .limit(1);

    if (!membership.length || (membership[0].role !== "owner" && membership[0].role !== "editor")) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get recipe title for logging
    const recipe = await db
      .select({ title: recipes.title })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    // Remove recipe from book
    const deletedRows = await db
      .delete(bookRecipes)
      .where(and(
        eq(bookRecipes.bookId, bookId),
        eq(bookRecipes.recipeId, recipeId)
      ));

    // Log the activity if recipe was found and removed
    if (recipe.length) {
      await db
        .insert(bookActivityLog)
        .values({
          bookId,
          userId: currentUser.id,
          action: "removed_recipe",
          targetName: recipe[0].title,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/books/[id]/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to remove recipe from book" },
      { status: 500 }
    );
  }
}