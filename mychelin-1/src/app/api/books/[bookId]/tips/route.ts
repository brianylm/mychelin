import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookTips, bookMembers, books, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ bookId: string }> };

// ─── GET /api/books/[bookId]/tips ──────────────────────────
// List cooking principles/tips for a book, ordered by created_at desc, with author info
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = await params;
    const bookIdNum = parseInt(bookId);

    // Check membership
    const membership = await db
      .select()
      .from(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookIdNum),
        eq(bookMembers.userId, currentUser.id)
      ))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch tips with author info via raw join
    // bookTips.bookId is TEXT, books.id is INTEGER — use sql cast
    const tips = await db
      .select({
        id: bookTips.id,
        content: bookTips.content,
        createdAt: bookTips.createdAt,
        addedBy: bookTips.addedBy,
        authorName: sql<string>`(SELECT name FROM users WHERE CAST(id AS TEXT) = ${bookTips.addedBy})`,
      })
      .from(bookTips)
      .where(eq(bookTips.bookId, bookId))
      .orderBy(desc(bookTips.createdAt));

    return NextResponse.json(tips);
  } catch (error) {
    console.error("GET /api/books/[bookId]/tips error:", error);
    return NextResponse.json({ error: "Failed to fetch tips" }, { status: 500 });
  }
}

// ─── POST /api/books/[bookId]/tips ─────────────────────────
// Add a cooking principle/tip to a book
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = await params;
    const bookIdNum = parseInt(bookId);

    // Check membership
    const membership = await db
      .select()
      .from(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookIdNum),
        eq(bookMembers.userId, currentUser.id)
      ))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const newTip = {
      id: uuidv4(),
      bookId: bookId,
      content: content.trim(),
      addedBy: String(currentUser.id),
      createdAt: Math.floor(Date.now() / 1000),
    };

    await db.insert(bookTips).values(newTip);

    return NextResponse.json({
      ...newTip,
      authorName: currentUser.name,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/books/[bookId]/tips error:", error);
    return NextResponse.json({ error: "Failed to add tip" }, { status: 500 });
  }
}
