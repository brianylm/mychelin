import { NextRequest, NextResponse } from "next/server";
import { db, recipeVersions } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

// POST /api/recipes/[id]/versions/[versionId]/restore
// Restores a past version by creating a new version with its ingredients + instructions
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;

  try {
    // Fetch the version to restore
    const versionToRestore = await db.query.recipeVersions.findFirst({
      where: eq(recipeVersions.id, versionId),
    });

    if (!versionToRestore || versionToRestore.recipeId !== id) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Get the current highest version number
    const latestVersions = await db
      .select({ versionNumber: recipeVersions.versionNumber })
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, id))
      .orderBy(desc(recipeVersions.versionNumber))
      .limit(1);

    const latestVersionNumber = latestVersions[0]?.versionNumber || 0;

    // Create a new version with the restored content
    const newVersionId = crypto.randomUUID();
    const newVersionNumber = latestVersionNumber + 1;

    await db.insert(recipeVersions).values({
      id: newVersionId,
      recipeId: id,
      versionNumber: newVersionNumber,
      ingredients: versionToRestore.ingredients,
      instructions: versionToRestore.instructions,
      notes: versionToRestore.notes,
      changedBy: (await getCurrentUserId()) || "demo-user",
      changeNote: `Restored from version ${versionToRestore.versionNumber}`,
    });

    const newVersion = await db.query.recipeVersions.findFirst({
      where: eq(recipeVersions.id, newVersionId),
    });

    return NextResponse.json({ version: newVersion });
  } catch (error) {
    console.error("Error restoring recipe version:", error);
    return NextResponse.json({ error: "Failed to restore version" }, { status: 500 });
  }
}
