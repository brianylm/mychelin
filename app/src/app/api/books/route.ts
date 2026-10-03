import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { books, bookMembers, bookRecipes, bookActivityLog, recipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { mergeBookRecipeMemberships } from "@/lib/book-membership";
import { eq, sql } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── GET /api/books ────────────────────────────────────────
// Returns all books the current user is a member of (any role)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [userBooks, linkedMemberships, directMemberships] = await Promise.all([
      db
        .select({
          id: books.id,
          title: books.title,
          description: books.description,
          coverEmoji: books.coverEmoji,
          coverColor: books.coverColor,
          createdBy: books.createdBy,
          isPublic: books.isPublic,
          createdAt: books.createdAt,
          updatedAt: books.updatedAt,
          memberCount: sql<number>`count(distinct ${bookMembers.userId})`,
          userRole: bookMembers.role,
          isOwner: sql<boolean>`${books.createdBy} = ${currentUser.id}`,
        })
        .from(books)
        .innerJoin(bookMembers, eq(books.id, bookMembers.bookId))
        .where(eq(bookMembers.userId, currentUser.id))
        .groupBy(books.id, bookMembers.role)
        .orderBy(books.updatedAt),
      db
        .select({ bookId: bookRecipes.bookId, recipeId: bookRecipes.recipeId })
        .from(bookRecipes)
        .innerJoin(recipes, eq(bookRecipes.recipeId, recipes.id))
        .innerJoin(bookMembers, eq(bookRecipes.bookId, bookMembers.bookId))
        .where(eq(bookMembers.userId, currentUser.id)),
      db
        .select({ bookId: recipes.bookId, recipeId: recipes.id })
        .from(recipes)
        .innerJoin(bookMembers, eq(recipes.bookId, bookMembers.bookId))
        .where(eq(bookMembers.userId, currentUser.id)),
    ]);

    const recipeIdsByBook = mergeBookRecipeMemberships(
      linkedMemberships,
      directMemberships.flatMap((row) => row.bookId == null ? [] : [{ ...row, bookId: row.bookId }])
    );

    return NextResponse.json(userBooks.map((book) => {
      const recipeIds = recipeIdsByBook.get(book.id) ?? [];
      return { ...book, recipeIds, recipeCount: recipeIds.length };
    }));
  } catch (error) {
    console.error("GET /api/books error:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

// ─── POST /api/books ───────────────────────────────────────
// Creates a new book
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, coverEmoji, coverColor } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Create the book
    const [newBook] = await db
      .insert(books)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        coverEmoji: coverEmoji || "📚",
        coverColor: coverColor || "amber",
        createdBy: currentUser.id,
        isPublic: false,
      })
      .returning();

    // Add creator as owner in bookMembers
    await db
      .insert(bookMembers)
      .values({
        bookId: newBook.id,
        userId: currentUser.id,
        role: "owner",
      });

    // Log the activity
    await db
      .insert(bookActivityLog)
      .values({
        bookId: newBook.id,
        userId: currentUser.id,
        action: "created_book",
        targetName: newBook.title,
      });

    // Return the new book with counts
    const bookWithCounts = {
      ...newBook,
      memberCount: 1,
      recipeCount: 0,
      recipeIds: [],
      userRole: "owner" as const,
      isOwner: true,
    };

    return NextResponse.json(bookWithCounts, { status: 201 });
  } catch (error) {
    console.error("POST /api/books error:", error);
    return NextResponse.json(
      { error: "Failed to create book" },
      { status: 500 }
    );
  }
}
