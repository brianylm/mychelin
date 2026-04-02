import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeVersions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

// ─── PUT /api/recipes/:id/versions/:versionId ──────────────
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id, versionId } = await context.params;
    const recipeId = Number(id);
    const verId = Number(versionId);
    const body = await request.json();

    // Verify version belongs to recipe
    const existing = await db.query.recipeVersions.findFirst({
      where: eq(recipeVersions.id, verId),
    });

    if (!existing || existing.recipeId !== recipeId) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.closenessRating !== undefined) updateData.closenessRating = body.closenessRating;
    if (body.closenessNotes !== undefined) updateData.closenessNotes = body.closenessNotes;
    if (body.cookingSessionDate !== undefined) updateData.cookingSessionDate = body.cookingSessionDate;
    if (body.changeNote !== undefined) updateData.changeNote = body.changeNote;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.captureMethod !== undefined) updateData.captureMethod = body.captureMethod;
    if (body.photos !== undefined) updateData.photos = JSON.stringify(body.photos);
    if (body.ingredients !== undefined) updateData.ingredients = JSON.stringify(body.ingredients);
    if (body.instructions !== undefined) updateData.instructions = JSON.stringify(body.instructions);

    const [updated] = await db
      .update(recipeVersions)
      .set(updateData)
      .where(eq(recipeVersions.id, verId))
      .returning();

    return NextResponse.json({
      ...updated,
      ingredients: updated.ingredients ? JSON.parse(updated.ingredients) : [],
      instructions: updated.instructions ? JSON.parse(updated.instructions) : [],
      photos: updated.photos ? JSON.parse(updated.photos) : [],
    });
  } catch (error) {
    console.error("PUT /api/recipes/[id]/versions/[versionId] error:", error);
    return NextResponse.json(
      { error: "Failed to update version" },
      { status: 500 }
    );
  }
}
