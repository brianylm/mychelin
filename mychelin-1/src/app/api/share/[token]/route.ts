import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shareLinks, recipes, books, ingredients, instructions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ token: string }> };

// GET /api/share/:token — public access to shared resource
// Optional: ?recipeId=X to fetch a full recipe within a shared book
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const recipeId = request.nextUrl.searchParams.get("recipeId");

    const link = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.token, token))
      .limit(1);

    if (!link.length) {
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 });
    }

    const shareLink = link[0];

    // Fetch a specific recipe within a shared book
    if (recipeId && shareLink.resourceType === "book") {
      const recipe = await db.query.recipes.findFirst({
        where: and(
          eq(recipes.id, Number(recipeId)),
          eq(recipes.bookId, shareLink.resourceId)
        ),
        with: {
          ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
          instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
          photos: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
        },
      });

      if (!recipe) {
        return NextResponse.json({ error: "Recipe not found in this book" }, { status: 404 });
      }

      return NextResponse.json({
        type: "recipe",
        permission: shareLink.permission,
        data: recipe,
      });
    }

    if (shareLink.resourceType === "recipe") {
      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, shareLink.resourceId),
        with: {
          ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
          instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
          photos: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
        },
      });

      if (!recipe) {
        return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
      }

      return NextResponse.json({
        type: "recipe",
        permission: shareLink.permission,
        data: recipe,
      });
    }

    if (shareLink.resourceType === "book") {
      const book = await db.query.books.findFirst({
        where: eq(books.id, shareLink.resourceId),
      });

      if (!book) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 });
      }

      // Get recipes in this book
      const bookRecipes = await db
        .select({
          id: recipes.id,
          title: recipes.title,
          cuisine: recipes.cuisine,
          imageUrl: recipes.imageUrl,
          description: recipes.description,
        })
        .from(recipes)
        .where(eq(recipes.bookId, book.id))
        .orderBy(recipes.title);

      return NextResponse.json({
        type: "book",
        permission: shareLink.permission,
        data: { ...book, recipes: bookRecipes },
      });
    }

    return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/share/[token] error:", error);
    return NextResponse.json({ error: "Failed to load shared content" }, { status: 500 });
  }
}
