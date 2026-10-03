import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookMembers, bookRecipes, bookActivityLog, recipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";
import { mergeBookRecipeRows } from "@/lib/book-membership";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

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

    const [linkedRows, directRows] = await Promise.all([
      db
        .select({
          id: recipes.id,
          title: recipes.title,
          description: recipes.description,
          cuisine: recipes.cuisine,
          imageUrl: recipes.imageUrl,
          prepTime: recipes.prepTime,
          cookTime: recipes.cookTime,
          status: recipes.status,
        })
        .from(bookRecipes)
        .innerJoin(recipes, eq(bookRecipes.recipeId, recipes.id))
        .where(eq(bookRecipes.bookId, bookId))
        .orderBy(bookRecipes.sortOrder),
      db
        .select({
          id: recipes.id,
          title: recipes.title,
          description: recipes.description,
          cuisine: recipes.cuisine,
          imageUrl: recipes.imageUrl,
          prepTime: recipes.prepTime,
          cookTime: recipes.cookTime,
          status: recipes.status,
        })
        .from(recipes)
        .where(eq(recipes.bookId, bookId))
        .orderBy(recipes.title),
    ]);

    const result = mergeBookRecipeRows(linkedRows, directRows);

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

    // Check if recipe exists and the editor can access it before adding
    // it to a shared book.
    if (!(await canUserAccessRecipe(currentUser.id, Number(recipeId)))) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    const recipe = await db
      .select({ title: recipes.title })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    // Check if recipe is already in the book
    const [linkedExisting, directExisting] = await Promise.all([
      db
        .select({ id: bookRecipes.id })
        .from(bookRecipes)
        .where(and(
          eq(bookRecipes.bookId, bookId),
          eq(bookRecipes.recipeId, recipeId)
        ))
        .limit(1),
      db
        .select({ id: recipes.id })
        .from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.bookId, bookId)))
        .limit(1),
    ]);

    if (linkedExisting.length || directExisting.length) {
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

    // Get recipe title for logging, scoped to the book membership row so
    // a guessed recipe id cannot reveal another recipe title.
    const [linkedRecipe, directRecipe] = await Promise.all([
      db
        .select({ title: recipes.title })
        .from(bookRecipes)
        .innerJoin(recipes, eq(bookRecipes.recipeId, recipes.id))
        .where(and(
          eq(bookRecipes.bookId, bookId),
          eq(bookRecipes.recipeId, recipeId)
        ))
        .limit(1),
      db
        .select({ title: recipes.title })
        .from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.bookId, bookId)))
        .limit(1),
    ]);
    const recipe = linkedRecipe[0] ?? directRecipe[0];

    // Remove either supported membership path. A recipe can have both after
    // legacy migrations, so clear both in one action.
    await db.batch([
      db
        .delete(bookRecipes)
        .where(and(
          eq(bookRecipes.bookId, bookId),
          eq(bookRecipes.recipeId, recipeId)
        )),
      db
        .update(recipes)
        .set({ bookId: null })
        .where(and(eq(recipes.id, recipeId), eq(recipes.bookId, bookId))),
    ]);

    // Log the activity if recipe was found and removed
    if (recipe) {
      await db
        .insert(bookActivityLog)
        .values({
          bookId,
          userId: currentUser.id,
          action: "removed_recipe",
          targetName: recipe.title,
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
