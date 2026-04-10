import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookMembers, bookActivityLog, users, books } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/books/[id]/members ─────────────────────────
// Invite a user by email (owner only)
export async function POST(
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
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (!["owner", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if current user is the owner
    const ownerMembership = await db
      .select()
      .from(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookId),
        eq(bookMembers.userId, currentUser.id),
        eq(bookMembers.role, "owner")
      ))
      .limit(1);

    if (!ownerMembership.length) {
      return NextResponse.json(
        { error: "Only the book owner can invite members" },
        { status: 403 }
      );
    }

    // Find user by email
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!targetUser.length) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookId),
        eq(bookMembers.userId, targetUser[0].id)
      ))
      .limit(1);

    if (existingMembership.length) {
      return NextResponse.json(
        { error: "User is already a member of this book" },
        { status: 409 }
      );
    }

    // Add user as member
    const [newMembership] = await db
      .insert(bookMembers)
      .values({
        bookId,
        userId: targetUser[0].id,
        role,
      })
      .returning();

    // Log the activity
    await db
      .insert(bookActivityLog)
      .values({
        bookId,
        userId: currentUser.id,
        action: "invited_member",
        targetName: targetUser[0].name,
      });

    return NextResponse.json({
      ...newMembership,
      user: {
        id: targetUser[0].id,
        name: targetUser[0].name,
        email: targetUser[0].email,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/books/[id]/members error:", error);
    return NextResponse.json(
      { error: "Failed to invite member" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/books/[id]/members ────────────────────────
// Remove a member (owner only, can't remove self)
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
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if current user is the owner
    const ownerMembership = await db
      .select()
      .from(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookId),
        eq(bookMembers.userId, currentUser.id),
        eq(bookMembers.role, "owner")
      ))
      .limit(1);

    if (!ownerMembership.length) {
      return NextResponse.json(
        { error: "Only the book owner can remove members" },
        { status: 403 }
      );
    }

    // Can't remove self
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the book" },
        { status: 400 }
      );
    }

    // Get user name for logging
    const targetUser = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Remove the member
    await db
      .delete(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookId),
        eq(bookMembers.userId, userId)
      ));

    // Log the activity
    if (targetUser.length) {
      await db
        .insert(bookActivityLog)
        .values({
          bookId,
          userId: currentUser.id,
          action: "removed_member",
          targetName: targetUser[0].name,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/books/[id]/members error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/books/[id]/members ─────────────────────────
// Change member role (owner only)
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
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 }
      );
    }

    if (!["owner", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if current user is the owner
    const ownerMembership = await db
      .select()
      .from(bookMembers)
      .where(and(
        eq(bookMembers.bookId, bookId),
        eq(bookMembers.userId, currentUser.id),
        eq(bookMembers.role, "owner")
      ))
      .limit(1);

    if (!ownerMembership.length) {
      return NextResponse.json(
        { error: "Only the book owner can change member roles" },
        { status: 403 }
      );
    }

    // Update the member role
    const [updatedMembership] = await db
      .update(bookMembers)
      .set({ role })
      .where(and(
        eq(bookMembers.bookId, bookId),
        eq(bookMembers.userId, userId)
      ))
      .returning();

    return NextResponse.json(updatedMembership);
  } catch (error) {
    console.error("PATCH /api/books/[id]/members error:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}