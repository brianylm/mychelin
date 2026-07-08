import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shareLinks, books } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getSharedRecipeDTO,
  isRecipeInSharedBook,
  listSharedBookRecipeCards,
} from "@/lib/shared-recipe";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ token: string }> };

// GET /api/share/:token - public access to shared resource.
// Recipe payloads are definitive-version DTOs only: no attempts, next-try
// plans, internal ids, private ratings, meal plans, or owner metadata.
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

    if (recipeId && shareLink.resourceType === "book") {
      const recipeNumber = Number(recipeId);
      const belongsToBook = Number.isFinite(recipeNumber)
        ? await isRecipeInSharedBook(recipeNumber, shareLink.resourceId)
        : false;
      const recipe = belongsToBook ? await getSharedRecipeDTO(recipeNumber) : null;

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
      const recipe = await getSharedRecipeDTO(shareLink.resourceId);

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

      const bookRecipes = await listSharedBookRecipeCards(book.id);

      return NextResponse.json({
        type: "book",
        permission: shareLink.permission,
        data: {
          id: book.id,
          title: book.title,
          description: book.description,
          coverEmoji: book.coverEmoji,
          coverColor: book.coverColor,
          recipes: bookRecipes,
        },
      });
    }

    return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/share/[token] error:", error);
    return NextResponse.json({ error: "Failed to load shared content" }, { status: 500 });
  }
}
