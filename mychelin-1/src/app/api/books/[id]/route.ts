import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { books, bookMembers, bookRecipes, bookActivityLog, users, recipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

// ─── GET /api/books/[id] ───────────────────────────────────
// Get book details with recipes, members, and activity log
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

    // Check if user is a member of this book
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

    // Get book details
    const book = await db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book.length) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 }
      );
    }

    // Get recipes in this book
    const bookRecipesList = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        description: recipes.description,
        cuisine: recipes.cuisine,
        imageUrl: recipes.imageUrl,
        prepTime: recipes.prepTime,
        cookTime: recipes.cookTime,
        yield: recipes.yield,
        addedAt: bookRecipes.addedAt,
        addedBy: bookRecipes.addedBy,
        sortOrder: bookRecipes.sortOrder,
      })
      .from(bookRecipes)
      .innerJoin(recipes, eq(bookRecipes.recipeId, recipes.id))
      .where(eq(bookRecipes.bookId, bookId))
      .orderBy(bookRecipes.sortOrder);

    // Get members
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: bookMembers.role,
        joinedAt: bookMembers.joinedAt,
      })
      .from(bookMembers)
      .innerJoin(users, eq(bookMembers.userId, users.id))
      .where(eq(bookMembers.bookId, bookId));

    // Get recent activity log (last 20)
    const activityLog = await db
      .select({
        id: bookActivityLog.id,
        action: bookActivityLog.action,
        targetName: bookActivityLog.targetName,
        createdAt: bookActivityLog.createdAt,
        userName: users.name,
      })
      .from(bookActivityLog)
      .innerJoin(users, eq(bookActivityLog.userId, users.id))
      .where(eq(bookActivityLog.bookId, bookId))
      .orderBy(desc(bookActivityLog.createdAt))
      .limit(20);

    return NextResponse.json({
      ...book[0],
      recipes: bookRecipesList,
      members,
      activityLog,
      userRole: membership[0].role,
      isOwner: book[0].createdBy === currentUser.id,
    });
  } catch (error) {
    console.error("GET /api/books/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch book details" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/books/[id] ─────────────────────────────────
// Update book (title, description, coverEmoji, coverColor)
export async function PATCH(
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

    const body = await request.json();
    const { title, description, coverEmoji, coverColor } = body;

    if (title && !title.trim()) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (coverEmoji !== undefined) updateData.coverEmoji = coverEmoji;
    if (coverColor !== undefined) updateData.coverColor = coverColor;

    const [updatedBook] = await db
      .update(books)
      .set(updateData)
      .where(eq(books.id, bookId))
      .returning();

    // Log the activity
    await db
      .insert(bookActivityLog)
      .values({
        bookId: bookId,
        userId: currentUser.id,
        action: "updated_book",
        targetName: updatedBook.title,
      });

    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error("PATCH /api/books/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update book" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/books/[id] ────────────────────────────────
// Delete book (owner only)
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

    // Check if user is the owner
    const book = await db
      .select()
      .from(books)
      .where(and(
        eq(books.id, bookId),
        eq(books.createdBy, currentUser.id)
      ))
      .limit(1);

    if (!book.length) {
      return NextResponse.json(
        { error: "Access denied or book not found" },
        { status: 403 }
      );
    }

    // Delete the book (cascades will handle related tables)
    await db
      .delete(books)
      .where(eq(books.id, bookId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/books/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 500 }
    );
  }
}