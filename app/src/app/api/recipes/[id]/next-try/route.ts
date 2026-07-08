import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeAttempts, recipeNextTries, recipeVersions, recipes } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  ensureRecipeAttemptsTable,
  ensureRecipeNextTriesTable,
} from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";
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

function parseNextTry(row: typeof recipeNextTries.$inferSelect | null) {
  if (!row) return null;
  return {
    ...row,
    ingredients: parseArray(row.ingredients),
    instructions: parseArray(row.instructions),
  };
}

async function latestVersion(recipeId: number) {
  const [latest] = await db
    .select()
    .from(recipeVersions)
    .where(eq(recipeVersions.recipeId, recipeId))
    .orderBy(desc(recipeVersions.versionNumber))
    .limit(1);
  return latest ?? null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeNextTriesTable();
    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

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

    return NextResponse.json({ nextTry: parseNextTry(nextTry ?? null) });
  } catch (error) {
    console.error("GET /api/recipes/[id]/next-try error:", error);
    return NextResponse.json({ error: "Failed to fetch next try" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeAttemptsTable();
    await ensureRecipeNextTriesTable();
    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const sourceAttemptId = body.sourceAttemptId ? Number(body.sourceAttemptId) : null;
    let sourceVersionId = body.sourceVersionId ? Number(body.sourceVersionId) : null;
    let ingredientsData = Array.isArray(body.ingredients) ? body.ingredients : null;
    let instructionsData = Array.isArray(body.instructions) ? body.instructions : null;

    if (sourceAttemptId) {
      const [attempt] = await db
        .select()
        .from(recipeAttempts)
        .where(
          and(
            eq(recipeAttempts.id, sourceAttemptId),
            eq(recipeAttempts.recipeId, recipeId),
            eq(recipeAttempts.userId, currentUser.id)
          )
        )
        .limit(1);

      if (!attempt) {
        return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
      }

      sourceVersionId = sourceVersionId ?? attempt.versionId ?? null;
      ingredientsData = ingredientsData ?? parseArray(attempt.ingredientsSnapshot);
      instructionsData = instructionsData ?? parseArray(attempt.instructionsSnapshot);
    }

    let sourceVersion = null as typeof recipeVersions.$inferSelect | null;
    if (sourceVersionId) {
      sourceVersion = await db.query.recipeVersions.findFirst({
        where: and(eq(recipeVersions.id, sourceVersionId), eq(recipeVersions.recipeId, recipeId)),
      }) ?? null;
      if (!sourceVersion) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }
    }

    if (!sourceVersion && (!ingredientsData || !instructionsData)) {
      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, recipeId),
        columns: { activeVersionId: true },
      });
      sourceVersion = recipe?.activeVersionId
        ? await db.query.recipeVersions.findFirst({
            where: and(eq(recipeVersions.id, recipe.activeVersionId), eq(recipeVersions.recipeId, recipeId)),
          }) ?? null
        : await latestVersion(recipeId);
      sourceVersionId = sourceVersion?.id ?? null;
    }

    ingredientsData = ingredientsData ?? parseArray(sourceVersion?.ingredients ?? null);
    instructionsData = instructionsData ?? parseArray(sourceVersion?.instructions ?? null);

    const now = new Date().toISOString();

    await db
      .update(recipeNextTries)
      .set({ status: "replaced", updatedAt: now })
      .where(
        and(
          eq(recipeNextTries.recipeId, recipeId),
          eq(recipeNextTries.userId, currentUser.id),
          eq(recipeNextTries.status, "active")
        )
      );

    const [nextTry] = await db
      .insert(recipeNextTries)
      .values({
        recipeId,
        sourceAttemptId,
        sourceVersionId,
        userId: currentUser.id,
        status: "active",
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        ingredients: JSON.stringify(ingredientsData),
        instructions: JSON.stringify(instructionsData),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await trackUsageEvent({
      userId: currentUser.id,
      eventName: "next_try_created",
      source: sourceAttemptId ? "attempt" : "recipe",
      recipeId,
      properties: {
        has_source_attempt: Boolean(sourceAttemptId),
        has_source_version: Boolean(sourceVersionId),
        ingredients_count: ingredientsData.length,
        steps_count: instructionsData.length,
      },
      path: requestPath(request),
    });

    return NextResponse.json({ nextTry: parseNextTry(nextTry) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes/[id]/next-try error:", error);
    return NextResponse.json({ error: "Failed to save next try" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeNextTriesTable();
    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    await db
      .update(recipeNextTries)
      .set({ status: "dismissed", updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(recipeNextTries.recipeId, recipeId),
          eq(recipeNextTries.userId, currentUser.id),
          eq(recipeNextTries.status, "active")
        )
      );

    await trackUsageEvent({
      userId: currentUser.id,
      eventName: "next_try_dismissed",
      source: "recipe",
      recipeId,
      path: requestPath(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recipes/[id]/next-try error:", error);
    return NextResponse.json({ error: "Failed to dismiss next try" }, { status: 500 });
  }
}
