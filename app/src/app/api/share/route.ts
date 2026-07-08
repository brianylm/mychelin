import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shareLinks, books, recipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// GET /api/share?type=recipe&id=1 — list share links for a resource
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "type and id required" }, { status: 400 });
    }

    const links = await db
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.resourceType, type),
          eq(shareLinks.resourceId, Number(id)),
          eq(shareLinks.createdBy, currentUser.id)
        )
      );

    return NextResponse.json(links);
  } catch (error) {
    console.error("GET /api/share error:", error);
    return NextResponse.json({ error: "Failed to fetch share links" }, { status: 500 });
  }
}

// POST /api/share — create a share link
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceType, resourceId, permission } = await request.json();

    if (!resourceType || !resourceId || !permission) {
      return NextResponse.json({ error: "resourceType, resourceId, permission required" }, { status: 400 });
    }

    if (!["recipe", "book"].includes(resourceType)) {
      return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
    }

    if (!["view", "edit"].includes(permission)) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 400 });
    }

    // Public sharing is owner-controlled. Book membership grants in-app
    // access, but should not let a viewer/editor mint a public recipe link.
    if (resourceType === "recipe") {
      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, Number(resourceId)),
        columns: { userId: true },
      });
      if (!recipe || recipe.userId !== currentUser.id) {
        return NextResponse.json({ error: "Recipe not found or not owned" }, { status: 404 });
      }
    } else {
      const book = await db.query.books.findFirst({
        where: eq(books.id, Number(resourceId)),
      });
      if (!book || book.createdBy !== currentUser.id) {
        return NextResponse.json({ error: "Book not found or not owned" }, { status: 404 });
      }
    }

    // Check if link with same permission already exists
    const existing = await db
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.resourceType, resourceType),
          eq(shareLinks.resourceId, Number(resourceId)),
          eq(shareLinks.permission, permission),
          eq(shareLinks.createdBy, currentUser.id)
        )
      )
      .limit(1);

    if (existing.length) {
      return NextResponse.json(existing[0]);
    }

    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    const [link] = await db
      .insert(shareLinks)
      .values({
        token,
        resourceType,
        resourceId,
        permission,
        createdBy: currentUser.id,
      })
      .returning();

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("POST /api/share error:", error);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}

// DELETE /api/share — delete a share link
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    await db
      .delete(shareLinks)
      .where(
        and(
          eq(shareLinks.id, id),
          eq(shareLinks.createdBy, currentUser.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/share error:", error);
    return NextResponse.json({ error: "Failed to delete share link" }, { status: 500 });
  }
}
