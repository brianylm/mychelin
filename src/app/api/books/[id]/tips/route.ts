import { NextRequest, NextResponse } from "next/server";
import { db, bookTips, bookMembers, recipeBooks } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

// GET /api/books/[id]/tips — list tips for a book
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tips = await db.query.bookTips.findMany({
    where: eq(bookTips.bookId, id),
    with: { author: true },
    orderBy: [desc(bookTips.createdAt)],
  });

  return NextResponse.json(tips);
}

// POST /api/books/[id]/tips — add a tip (any book member)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify membership
    const membership = await db.query.bookMembers.findFirst({
      where: (m, { and, eq }) => and(eq(m.bookId, id), eq(m.userId, userId)),
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden — not a book member" }, { status: 403 });
    }

    const body = await request.json();
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const tipId = crypto.randomUUID();

    await db.insert(bookTips).values({
      id: tipId,
      bookId: id,
      content: body.content.trim(),
      addedBy: userId,
    });

    const tip = await db.query.bookTips.findFirst({
      where: eq(bookTips.id, tipId),
      with: { author: true },
    });

    return NextResponse.json(tip, { status: 201 });
  } catch (error) {
    console.error("Error adding tip:", error);
    return NextResponse.json({ error: "Failed to add tip" }, { status: 500 });
  }
}
