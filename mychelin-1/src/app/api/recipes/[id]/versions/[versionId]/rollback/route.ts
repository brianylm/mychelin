import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeVersions, recipes } from "@/db/schema";
import { eq } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

// ─── POST /api/recipes/:id/versions/:versionId/rollback ────
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id, versionId } = await context.params;
    const recipeId = Number(id);
    const verId = Number(versionId);

    // Verify version belongs to recipe
    const version = await db.query.recipeVersions.findFirst({
      where: eq(recipeVersions.id, verId),
    });

    if (!version || version.recipeId !== recipeId) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Set this version as the active version
    await db
      .update(recipes)
      .set({
        activeVersionId: verId,
        updatedAt: new Date().toISOString() as string,
      })
      .where(eq(recipes.id, recipeId));

    return NextResponse.json({
      message: "Rolled back to version " + version.versionNumber,
      activeVersionId: verId,
    });
  } catch (error) {
    console.error("POST rollback error:", error);
    return NextResponse.json(
      { error: "Failed to rollback" },
      { status: 500 }
    );
  }
}
