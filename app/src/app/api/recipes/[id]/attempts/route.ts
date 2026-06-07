import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeAttempts, recipes } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { ensureRecipeAttemptsTable } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

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

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeAttemptsTable();
    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const attempts = await db
      .select()
      .from(recipeAttempts)
      .where(
        and(
          eq(recipeAttempts.recipeId, recipeId),
          eq(recipeAttempts.userId, currentUser.id)
        )
      )
      .orderBy(desc(recipeAttempts.cookedAt), desc(recipeAttempts.id));

    return NextResponse.json(attempts.map(parseAttempt));
  } catch (error) {
    console.error("GET /api/recipes/[id]/attempts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecipeAttemptsTable();
    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      columns: { activeVersionId: true },
    });
    const body = await request.json();
    const now = new Date().toISOString();
    const rating = normalizeRating(body.rating);

    if (body.rating !== undefined && body.rating !== null && rating === null) {
      return NextResponse.json(
        { error: "rating must be a half-star value from 0.5 to 5" },
        { status: 400 }
      );
    }

    const [attempt] = await db
      .insert(recipeAttempts)
      .values({
        recipeId,
        versionId: body.versionId ? Number(body.versionId) : recipe?.activeVersionId ?? null,
        mealPlanId: body.mealPlanId ? Number(body.mealPlanId) : null,
        userId: currentUser.id,
        cookedAt: typeof body.cookedAt === "string" ? body.cookedAt : now,
        rating,
        notes: body.notes ?? null,
        changeNotes: Array.isArray(body.changeNotes)
          ? JSON.stringify(body.changeNotes)
          : null,
        whatWorked: body.whatWorked ?? null,
        nextTime: body.nextTime ?? null,
        ingredientsSnapshot: Array.isArray(body.ingredientsSnapshot)
          ? JSON.stringify(body.ingredientsSnapshot)
          : null,
        instructionsSnapshot: Array.isArray(body.instructionsSnapshot)
          ? JSON.stringify(body.instructionsSnapshot)
          : null,
        createdAt: now,
      })
      .returning();

    return NextResponse.json(parseAttempt(attempt), { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes/[id]/attempts error:", error);
    return NextResponse.json(
      { error: "Failed to create attempt" },
      { status: 500 }
    );
  }
}
