import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shareLinks, recipes, books, ingredients, instructions } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ token: string }> };

// GET /api/share/:token — public access to shared resource
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;

    const link = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.token, token))
      .limit(1);

    if (!link.length) {
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 });
    }

    const shareLink = link[0];

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
