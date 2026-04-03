import { NextRequest, NextResponse } from "next/server";
import { db, recipeVersions } from "@/db";
import { eq, desc } from "drizzle-orm";

// GET /api/recipes/[id]/versions - Get all versions for a recipe
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const versions = await db
      .select({
        id: recipeVersions.id,
        versionNumber: recipeVersions.versionNumber,
        ingredients: recipeVersions.ingredients,
        instructions: recipeVersions.instructions,
        notes: recipeVersions.notes,
        changeNote: recipeVersions.changeNote,
        changedBy: recipeVersions.changedBy,
        createdAt: recipeVersions.createdAt,
      })
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, id))
      .orderBy(desc(recipeVersions.versionNumber));

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Error fetching recipe versions:", error);
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}
