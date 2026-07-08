import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeNextTries, recipeVersions, recipes } from "@/db/schema";
import { and, desc, eq, max } from "drizzle-orm";
import {
  ensureRecipeNextTriesTable,
  ensureVersionLabelColumn,
} from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe, canUserEditRecipe } from "@/lib/recipe-access";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

function parseArray(value: string | null | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeNextTriesTable();
    await ensureVersionLabelColumn();
    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (!(await canUserEditRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "Only the recipe owner or a book editor can promote next tries" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const setActive = body.setActive === true;

    const [nextTry] = await db
      .select()
      .from(recipeNextTries)
      .where(
        and(
          eq(recipeNextTries.recipeId, recipeId),
          eq(recipeNextTries.userId, currentUser.id),
          eq(recipeNextTries.status, "active")
        )
      )
      .orderBy(desc(recipeNextTries.updatedAt))
      .limit(1);

    if (!nextTry) {
      return NextResponse.json({ error: "No active next try" }, { status: 404 });
    }

    const ingredientsData = parseArray(nextTry.ingredients);
    const instructionsData = parseArray(nextTry.instructions);

    if (ingredientsData.length === 0 && instructionsData.length === 0) {
      return NextResponse.json(
        { error: "Next try needs ingredients or steps before promotion" },
        { status: 400 }
      );
    }

    const maxResult = await db
      .select({ maxVer: max(recipeVersions.versionNumber) })
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId));

    const nextVersion = (maxResult[0]?.maxVer ?? 0) + 1;
    const now = new Date().toISOString();

    const [newVersion] = await db
      .insert(recipeVersions)
      .values({
        recipeId,
        versionNumber: nextVersion,
        versionLabel: String(nextVersion),
        sourceVersionId: nextTry.sourceVersionId ?? null,
        captureMethod: "next_try_promotion",
        ingredients: JSON.stringify(ingredientsData),
        instructions: JSON.stringify(instructionsData),
        notes: nextTry.notes ?? null,
        changedBy: currentUser.id,
        changeNote: typeof body.changeNote === "string" && body.changeNote.trim()
          ? body.changeNote.trim()
          : "Promoted from next try",
        closenessRating: null,
        closenessNotes: nextTry.notes ?? null,
        photos: null,
      })
      .returning();

    await db
      .update(recipeNextTries)
      .set({
        status: "promoted",
        promotedVersionId: newVersion.id,
        updatedAt: now,
      })
      .where(eq(recipeNextTries.id, nextTry.id));

    if (setActive) {
      await db
        .update(recipes)
        .set({ activeVersionId: newVersion.id, updatedAt: now })
        .where(eq(recipes.id, recipeId));
    }

    await trackUsageEvent({
      userId: currentUser.id,
      eventName: "next_try_promoted_to_version",
      source: "next_try",
      recipeId,
      properties: {
        next_try_id: nextTry.id,
        version_id: newVersion.id,
        set_definitive: setActive,
        ingredients_count: ingredientsData.length,
        steps_count: instructionsData.length,
      },
      path: requestPath(request),
    });

    return NextResponse.json(
      {
        ...newVersion,
        ingredients: ingredientsData,
        instructions: instructionsData,
        photos: [],
        activeVersionId: setActive ? newVersion.id : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/recipes/[id]/next-try/promote error:", error);
    return NextResponse.json(
      { error: "Failed to promote next try" },
      { status: 500 }
    );
  }
}
