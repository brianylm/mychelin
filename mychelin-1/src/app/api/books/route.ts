import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { books, bookMembers, bookRecipes, bookActivityLog, users, recipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export const preferredRegion = "hnd1";

// ─── GET /api/books ────────────────────────────────────────
// Returns all books the current user is a member of (any role)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userBooks = await db
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
        recipeCount: sql<number>`count(distinct ${recipes.id})`,
        userRole: bookMembers.role,
        isOwner: sql<boolean>`${books.createdBy} = ${currentUser.id}`,
      })
      .from(books)
      .innerJoin(bookMembers, eq(books.id, bookMembers.bookId))
      .leftJoin(recipes, eq(books.id, recipes.bookId))
      .where(eq(bookMembers.userId, currentUser.id))
      .groupBy(books.id, bookMembers.role)
      .orderBy(books.updatedAt);

    return NextResponse.json(userBooks);
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