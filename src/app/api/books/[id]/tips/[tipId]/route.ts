import { NextRequest, NextResponse } from "next/server";
import { db, bookTips, bookMembers } from "@/db";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

// DELETE /api/books/[id]/tips/[tipId] — delete a tip (tip author or book owner)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tipId: string }> }
) {
  try {
    const { id, tipId } = await params;
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tip = await db.query.bookTips.findFirst({
      where: eq(bookTips.id, tipId),
    });

    if (!tip || tip.bookId !== id) {
      return NextResponse.json({ error: "Tip not found" }, { status: 404 });
    }

    // Allow if user is the tip author
    const isAuthor = tip.addedBy === userId;

    // Allow if user is the book owner
    let isOwner = false;
    if (!isAuthor) {
      const ownerMembership = await db.query.bookMembers.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.bookId, id), eq(m.userId, userId), eq(m.role, "owner")),
      });
      isOwner = !!ownerMembership;
    }

    if (!isAuthor && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(bookTips).where(eq(bookTips.id, tipId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tip:", error);
    return NextResponse.json({ error: "Failed to delete tip" }, { status: 500 });
  }
}
