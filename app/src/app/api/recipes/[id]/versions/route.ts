import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeAttempts, recipeVersions, recipes } from "@/db/schema";
import { and, desc, eq, inArray, like, max, or } from "drizzle-orm";
import { ensureRecipeAttemptDishRatingColumn, ensureRecipeAttemptsTable, ensureVersionLabelColumn } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe, recipesVisibleTo } from "@/lib/recipe-access";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  const rounded = Math.round(rating * 2) / 2;
  if (rounded < 0.5 || rounded > 5) return null;
  return rounded;
}

// ─── GET /api/recipes/:id/versions ─────────────────────────
// Returns the full fork tree's versions so the timeline can show the
// whole lineage — not just direct ancestors, but siblings and cousins
// spawned from the same root. Walks up via `recipes.forkedFrom` to find
// the root, then walks down to collect every descendant.
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const startRecipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, startRecipeId))) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Walk up to the root ancestor. Stop at user boundaries so shared-page
    // saves don't leak another user's version history. Cap at 20 hops.
    let rootId = startRecipeId;
    const seenUp = new Set<number>();
    let cursor: number | null = startRecipeId;
    for (let i = 0; i < 20 && cursor != null && !seenUp.has(cursor); i++) {
      seenUp.add(cursor);
      const row: { forkedFrom: string | null; userId: number | null } | undefined =
        await db.query.recipes.findFirst({
          where: eq(recipes.id, cursor),
          columns: { forkedFrom: true, userId: true },
        });
      // forkedFrom may be "57" (legacy) or "57:Recipe Title" (new format)
      const rawParent: string | null | undefined = row?.forkedFrom;
      const parentId: number = rawParent ? parseInt(rawParent) : NaN;
      if (!Number.isNaN(parentId) && parentId > 0) {
        // Check the parent belongs to the same user before crossing
        const parentRow: { userId: number | null } | undefined =
          await db.query.recipes.findFirst({
            where: eq(recipes.id, parentId),
            columns: { userId: true },
          });
        if (parentRow && parentRow.userId === currentUser.id) {
          rootId = parentId;
          cursor = parentId;
        } else {
          rootId = cursor;
          cursor = null;
        }
      } else {
        rootId = cursor;
        cursor = null;
      }
    }

    // BFS down from the root to collect every descendant. forkedFrom is
    // stored as text, so compare via LIKE on the string form.
    const allRecipeIds = new Set<number>([rootId]);
    let frontier: number[] = [rootId];
    for (let depth = 0; depth < 20 && frontier.length > 0; depth++) {
      const childPredicates = frontier.flatMap((parentId) => [
        eq(recipes.forkedFrom, String(parentId)),
        like(recipes.forkedFrom, String(parentId) + ":%"),
      ]);
      const children = await db
        .select({ id: recipes.id, forkedFrom: recipes.forkedFrom })
        .from(recipes)
        .where(and(recipesVisibleTo(currentUser.id), or(...childPredicates)));
      const next: number[] = [];
      for (const child of children) {
        if (!allRecipeIds.has(child.id)) {
          allRecipeIds.add(child.id);
          next.push(child.id);
        }
      }
      frontier = next;
    }

    const recipeIds = Array.from(allRecipeIds);

    const versions = recipeIds.length
      ? await db
          .select()
          .from(recipeVersions)
          .where(inArray(recipeVersions.recipeId, recipeIds))
          .orderBy(desc(recipeVersions.createdAt))
      : [];

    // Parse JSON fields
    const parsed = versions.map((v) => ({
      ...v,
      ingredients: v.ingredients ? JSON.parse(v.ingredients as string) : [],
      instructions: v.instructions ? JSON.parse(v.instructions as string) : [],
      photos: v.photos ? JSON.parse(v.photos as string) : [],
    }));

    // Get the current recipe's active version id
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, startRecipeId),
      columns: { activeVersionId: true },
    });

    return NextResponse.json({
      versions: parsed,
      activeVersionId: recipe?.activeVersionId ?? null,
    });
  } catch (error) {
    console.error("GET /api/recipes/[id]/versions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}

// ─── POST /api/recipes/:id/versions ────────────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureVersionLabelColumn();
    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      baseVersionId,
      captureMethod = "manual",
      ingredients: newIngredients,
      instructions: newInstructions,
      notes,
      changeNote,
      closenessRating,
      closenessNotes,
      cookingSessionDate,
      photos,
      setActive = false,
      createAttempt = false,
      attemptNotes,
      attemptChangeNotes,
      attemptCookedAt,
      attemptRating,
      attemptDishRating,
    } = body;

    const normalizedAttemptRating = normalizeRating(attemptRating);
    const normalizedAttemptDishRating = normalizeRating(attemptDishRating);

    if (createAttempt && attemptRating !== undefined && attemptRating !== null && normalizedAttemptRating === null) {
      return NextResponse.json(
        { error: "attemptRating must be a half-star value from 0.5 to 5" },
        { status: 400 }
      );
    }

    if (createAttempt && attemptDishRating !== undefined && attemptDishRating !== null && normalizedAttemptDishRating === null) {
      return NextResponse.json(
        { error: "attemptDishRating must be a half-star value from 0.5 to 5" },
        { status: 400 }
      );
    }

    if (createAttempt) {
      await ensureRecipeAttemptsTable();
      await ensureRecipeAttemptDishRatingColumn();
    }

    // Get next version number
    const maxResult = await db
      .select({ maxVer: max(recipeVersions.versionNumber) })
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId));

    const nextVersion = (maxResult[0]?.maxVer ?? 0) + 1;

    // Resolve ingredients/instructions from base version if not provided
    let ingredientsData = newIngredients;
    let instructionsData = newInstructions;

    if (baseVersionId && (!newIngredients || !newInstructions)) {
      const baseVersion = await db.query.recipeVersions.findFirst({
        where: and(
          eq(recipeVersions.id, Number(baseVersionId)),
          eq(recipeVersions.recipeId, recipeId)
        ),
      });
      if (baseVersion) {
        if (!newIngredients) {
          ingredientsData = baseVersion.ingredients
            ? JSON.parse(baseVersion.ingredients as string)
            : [];
        }
        if (!newInstructions) {
          instructionsData = baseVersion.instructions
            ? JSON.parse(baseVersion.instructions as string)
            : [];
        }
      }
    } else if (!newIngredients || !newInstructions) {
      // Fork from latest version
      const latest = await db
        .select()
        .from(recipeVersions)
        .where(eq(recipeVersions.recipeId, recipeId))
        .orderBy(desc(recipeVersions.versionNumber))
        .limit(1);

      if (latest[0]) {
        if (!newIngredients) {
          ingredientsData = latest[0].ingredients
            ? JSON.parse(latest[0].ingredients as string)
            : [];
        }
        if (!newInstructions) {
          instructionsData = latest[0].instructions
            ? JSON.parse(latest[0].instructions as string)
            : [];
        }
      }
    }

    const [newVersion] = await db
      .insert(recipeVersions)
      .values({
        recipeId,
        versionNumber: nextVersion,
        versionLabel: String(nextVersion),
        sourceVersionId: baseVersionId ? Number(baseVersionId) : null,
        captureMethod,
        ingredients: ingredientsData ? JSON.stringify(ingredientsData) : null,
        instructions: instructionsData ? JSON.stringify(instructionsData) : null,
        notes: notes ?? null,
        changeNote: changeNote ?? null,
        closenessRating: closenessRating ?? null,
        closenessNotes: closenessNotes ?? null,
        cookingSessionDate: cookingSessionDate ?? null,
        photos: photos ? JSON.stringify(photos) : null,
      })
      .returning();

    // Set as active version if requested
    if (setActive) {
      await db
        .update(recipes)
        .set({ activeVersionId: newVersion.id })
        .where(eq(recipes.id, recipeId));
    }

    let createdAttempt: typeof recipeAttempts.$inferSelect | null = null;
    if (createAttempt) {
      const now = new Date().toISOString();
      const notes = typeof attemptNotes === "string" && attemptNotes.trim()
        ? attemptNotes.trim()
        : null;
      const changeNotes = Array.isArray(attemptChangeNotes)
        ? attemptChangeNotes.filter((note) => typeof note === "string" && note.trim()).map((note) => note.trim())
        : [];
      const cookedAt = typeof attemptCookedAt === "string" && attemptCookedAt.trim()
        ? attemptCookedAt
        : now;

      const [attempt] = await db
        .insert(recipeAttempts)
        .values({
          recipeId,
          versionId: newVersion.id,
          promotedVersionId: newVersion.id,
          userId: currentUser.id,
          cookedAt,
          rating: normalizedAttemptRating,
          dishRating: normalizedAttemptDishRating,
          notes,
          changeNotes: changeNotes.length ? JSON.stringify(changeNotes) : null,
          ingredientsSnapshot: ingredientsData ? JSON.stringify(ingredientsData) : null,
          instructionsSnapshot: instructionsData ? JSON.stringify(instructionsData) : null,
          createdAt: now,
        })
        .returning();

      createdAttempt = attempt;

      await trackUsageEvent({
        userId: currentUser.id,
        eventName: "cook_attempt_created",
        source: "log_cook",
        recipeId,
        properties: {
          version_id: newVersion.id,
          has_rating: normalizedAttemptRating !== null,
          rating: normalizedAttemptRating ?? null,
          has_dish_rating: normalizedAttemptDishRating !== null,
          change_notes_count: changeNotes.length,
          ingredients_count: Array.isArray(ingredientsData) ? ingredientsData.length : 0,
          steps_count: Array.isArray(instructionsData) ? instructionsData.length : 0,
          created_version: true,
        },
        path: requestPath(request),
      });
    }

    return NextResponse.json({
      ...newVersion,
      ingredients: ingredientsData ?? [],
      instructions: instructionsData ?? [],
      photos: photos ?? [],
      createdAttempt,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes/[id]/versions error:", error);
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    );
  }
}
