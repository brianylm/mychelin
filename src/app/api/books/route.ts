import { NextRequest, NextResponse } from "next/server";
import { db, recipeBooks, bookMembers } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

// GET /api/books — list books for current user
export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db.query.bookMembers.findMany({
    where: eq(bookMembers.userId, userId),
    with: {
      book: {
        with: {
          members: true,
          recipes: true,
        },
      },
    },
  });

  const books = memberships.map((m) => ({
    ...m.book,
    memberCount: m.book.members.length,
    recipeCount: m.book.recipes.length,
    userRole: m.role,
  }));

  return NextResponse.json(books);
}

// POST /api/books — create a book
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const bookId = crypto.randomUUID();

    await db.insert(recipeBooks).values({
      id: bookId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      coverImageUrl: body.coverImageUrl || null,
      createdBy: userId,
    });

    await db.insert(bookMembers).values({
      id: crypto.randomUUID(),
      bookId,
      userId,
      role: "owner",
    });

    return NextResponse.json({ id: bookId }, { status: 201 });
  } catch (error) {
    console.error("Error creating book:", error);
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}
