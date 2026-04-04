import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookTips, bookMembers, books } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ bookId: string; tipId: string }> };

// ─── DELETE /api/books/[bookId]/tips/[tipId] ───────────────
// Delete a tip (author or book owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId, tipId } = await params;
    const bookIdNum = parseInt(bookId);

    // Fetch the tip
    const [tip] = await db
      .select()
      .from(bookTips)
      .where(and(eq(bookTips.id, tipId), eq(bookTips.bookId, bookId)))
      .limit(1);

    if (!tip) {
      return NextResponse.json({ error: "Tip not found" }, { status: 404 });
    }

    // Check if user is author or book owner
    const isAuthor = tip.addedBy === String(currentUser.id);

    if (!isAuthor) {
      // Check if they're the book owner
      const [book] = await db
        .select()
        .from(books)
        .where(and(eq(books.id, bookIdNum), eq(books.createdBy, currentUser.id)))
        .limit(1);

      if (!book) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    await db.delete(bookTips).where(eq(bookTips.id, tipId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/books/[bookId]/tips/[tipId] error:", error);
    return NextResponse.json({ error: "Failed to delete tip" }, { status: 500 });
  }
}
