import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { recipePhotos } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe, canUserEditRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, photoId } = await context.params;

    if (!(await canUserAccessRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (!(await canUserEditRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe photos" },
        { status: 403 }
      );
    }

    const [deleted] = await db
      .delete(recipePhotos)
      .where(
        and(
          eq(recipePhotos.id, Number(photoId)),
          eq(recipePhotos.recipeId, Number(id))
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete from Vercel Blob
    try {
      await del(deleted.blobUrl);
    } catch {
      // Blob deletion is best-effort
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
