import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeAttempts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureRecipeAttemptsTable } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string; attemptId: string }> };

function parseJsonArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  const rounded = Math.round(rating * 2) / 2;
  if (rounded < 0.5 || rounded > 5) return null;
  return rounded;
}

function parseAttempt(row: typeof recipeAttempts.$inferSelect) {
  return {
    ...row,
    changeNotes: parseJsonArray(row.changeNotes),
    ingredientsSnapshot: parseJsonArray(row.ingredientsSnapshot),
    instructionsSnapshot: parseJsonArray(row.instructionsSnapshot),
  };
}

async function getOwnedAttempt(userId: number, recipeId: number, attemptId: number) {
  const [attempt] = await db
    .select()
    .from(recipeAttempts)
    .where(
      and(
        eq(recipeAttempts.id, attemptId),
        eq(recipeAttempts.recipeId, recipeId),
        eq(recipeAttempts.userId, userId)
      )
    )
    .limit(1);
  return attempt;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureRecipeAttemptsTable();
    const { id, attemptId } = await context.params;
    const recipeId = Number(id);
    const attemptIdNumber = Number(attemptId);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const existing = await getOwnedAttempt(currentUser.id, recipeId, attemptIdNumber);
    if (!existing) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    const body = await request.json();
    const updateData: Partial<typeof recipeAttempts.$inferInsert> = {};

    if (body.rating !== undefined) {
      const rating = normalizeRating(body.rating);
      if (body.rating !== null && body.rating !== "" && rating === null) {
        return NextResponse.json({ error: "rating must be a half-star value from 0.5 to 5" }, { status: 400 });
      }
      updateData.rating = rating;
    }
    if (body.notes !== undefined) updateData.notes = body.notes ?? null;
    if (body.nextTime !== undefined) updateData.nextTime = body.nextTime ?? null;
    if (body.whatWorked !== undefined) updateData.whatWorked = body.whatWorked ?? null;
    if (Array.isArray(body.changeNotes)) updateData.changeNotes = JSON.stringify(body.changeNotes);
    if (typeof body.cookedAt === "string") updateData.cookedAt = body.cookedAt;

    const [updated] = await db
      .update(recipeAttempts)
      .set(updateData)
      .where(eq(recipeAttempts.id, existing.id))
      .returning();

    return NextResponse.json(parseAttempt(updated));
  } catch (error) {
    console.error("PATCH /api/recipes/[id]/attempts/[attemptId] error:", error);
    return NextResponse.json({ error: "Failed to update attempt" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureRecipeAttemptsTable();
    const { id, attemptId } = await context.params;
    const recipeId = Number(id);
    const attemptIdNumber = Number(attemptId);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const existing = await getOwnedAttempt(currentUser.id, recipeId, attemptIdNumber);
    if (!existing) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    await db.delete(recipeAttempts).where(eq(recipeAttempts.id, existing.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recipes/[id]/attempts/[attemptId] error:", error);
    return NextResponse.json({ error: "Failed to delete attempt" }, { status: 500 });
  }
}
