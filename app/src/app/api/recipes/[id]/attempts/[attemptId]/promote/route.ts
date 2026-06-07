import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeAttempts, recipeVersions, recipes } from "@/db/schema";
import { and, desc, eq, max } from "drizzle-orm";
import {
  ensureRecipeAttemptsTable,
  ensureVersionLabelColumn,
} from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string; attemptId: string }> };

function parseJsonArray(value: string | null | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cookedAtToUnix(value: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeAttemptsTable();
    await ensureVersionLabelColumn();
    const { id, attemptId } = await context.params;
    const recipeId = Number(id);
    const attemptIdNumber = Number(attemptId);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const [attempt] = await db
      .select()
      .from(recipeAttempts)
      .where(
        and(
          eq(recipeAttempts.id, attemptIdNumber),
          eq(recipeAttempts.recipeId, recipeId),
          eq(recipeAttempts.userId, currentUser.id)
        )
      )
      .limit(1);

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.promotedVersionId) {
      return NextResponse.json(
        { error: "Attempt has already been promoted" },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const setActive = body.setActive === true;

    const ingredientsSnapshot = parseJsonArray(attempt.ingredientsSnapshot);
    const instructionsSnapshot = parseJsonArray(attempt.instructionsSnapshot);

    let ingredientsData = ingredientsSnapshot;
    let instructionsData = instructionsSnapshot;

    if (ingredientsData.length === 0 || instructionsData.length === 0) {
      const latest = await db
        .select()
        .from(recipeVersions)
        .where(eq(recipeVersions.recipeId, recipeId))
        .orderBy(desc(recipeVersions.versionNumber))
        .limit(1);

      if (ingredientsData.length === 0) {
        ingredientsData = parseJsonArray(latest[0]?.ingredients ?? null);
      }
      if (instructionsData.length === 0) {
        instructionsData = parseJsonArray(latest[0]?.instructions ?? null);
      }
    }

    const maxResult = await db
      .select({ maxVer: max(recipeVersions.versionNumber) })
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId));

    const nextVersion = (maxResult[0]?.maxVer ?? 0) + 1;
    const cookedDate = attempt.cookedAt
      ? new Date(attempt.cookedAt).toLocaleDateString("en-SG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "cook attempt";
    const ratingSuffix = attempt.rating ? " (" + attempt.rating + "/5)" : "";

    const [newVersion] = await db
      .insert(recipeVersions)
      .values({
        recipeId,
        versionNumber: nextVersion,
        versionLabel: String(nextVersion),
        sourceVersionId: attempt.versionId ?? null,
        captureMethod: "attempt_promotion",
        ingredients: JSON.stringify(ingredientsData),
        instructions: JSON.stringify(instructionsData),
        notes: attempt.notes ?? null,
        changedBy: currentUser.id,
        changeNote: body.changeNote ?? "Promoted from " + cookedDate + ratingSuffix,
        closenessRating: null,
        closenessNotes: attempt.nextTime ?? null,
        cookingSessionDate: cookedAtToUnix(attempt.cookedAt),
        photos: null,
      })
      .returning();

    await db
      .update(recipeAttempts)
      .set({ promotedVersionId: newVersion.id })
      .where(eq(recipeAttempts.id, attempt.id));

    if (setActive) {
      await db
        .update(recipes)
        .set({ activeVersionId: newVersion.id })
        .where(eq(recipes.id, recipeId));
    }

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
    console.error(
      "POST /api/recipes/[id]/attempts/[attemptId]/promote error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to promote attempt" },
      { status: 500 }
    );
  }
}
