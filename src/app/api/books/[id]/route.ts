import { NextRequest, NextResponse } from "next/server";
import { db, recipeBooks, bookMembers } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

// GET /api/books/[id] — get book with recipes + tips + members
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const book = await db.query.recipeBooks.findFirst({
    where: eq(recipeBooks.id, id),
    with: {
      members: {
        with: { user: true },
      },
      recipes: true,
      tips: {
        with: { author: true },
        orderBy: (tips, { desc }) => [desc(tips.createdAt)],
      },
    },
  });

  if (!book) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check if user is a member (or allow public read for now)
  if (userId) {
    const isMember = book.members.some((m) => m.userId === userId);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(book);
}
