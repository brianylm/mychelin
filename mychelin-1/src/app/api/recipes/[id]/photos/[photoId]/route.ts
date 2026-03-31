import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { recipePhotos } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id, photoId } = await context.params;

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
