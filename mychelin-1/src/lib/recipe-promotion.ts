import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schema";

/**
 * Server-side auto-promotion of draft recipes.
 *
 * A draft becomes "active" as soon as it satisfies BOTH:
 *   1. A real title (non-empty and not the "Untitled recipe" placeholder)
 *   2. At least one ingredient OR instruction
 *
 * Called from the endpoints that can make a draft satisfy these conditions:
 * POST /api/recipes/:id/ingredients, POST /api/recipes/:id/instructions,
 * and PATCH /api/recipes/:id (on title update).
 *
 * Uses the relational `with: { ingredients, instructions }` query pattern
 * that the rest of the codebase already uses — one query, no separate
 * count() roundtrips, less surface area for drizzle/Turso quirks.
 *
 * Logs to stdout on every call so we can diagnose the full flow from
 * Vercel function logs.
 *
 * Idempotent and no-op for already-active recipes. Failure is swallowed
 * so the calling endpoint's primary operation isn't derailed — a stale
 * draft status is recoverable, but a 500 on adding an ingredient isn't.
 */
export async function maybePromoteDraftToActive(recipeId: number): Promise<void> {
  try {
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      with: {
        ingredients: { columns: { id: true } },
        instructions: { columns: { id: true } },
      },
    });

    if (!recipe) {
      console.log(`[promote] recipe=${recipeId} not found`);
      return;
    }

    const ingredientCount = recipe.ingredients?.length ?? 0;
    const instructionCount = recipe.instructions?.length ?? 0;

    console.log(
      `[promote] recipe=${recipeId} status=${recipe.status} title="${recipe.title}" ing=${ingredientCount} inst=${instructionCount}`
    );

    if (recipe.status !== "draft") {
      console.log(`[promote] recipe=${recipeId} skip: not a draft`);
      return;
    }

    const title = (recipe.title ?? "").trim();
    const hasRealTitle = title !== "" && title !== "Untitled recipe";
    if (!hasRealTitle) {
      console.log(`[promote] recipe=${recipeId} skip: no real title`);
      return;
    }

    const hasContent = ingredientCount > 0 || instructionCount > 0;
    if (!hasContent) {
      console.log(`[promote] recipe=${recipeId} skip: no content`);
      return;
    }

    await db
      .update(recipes)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(recipes.id, recipeId));

    console.log(`[promote] recipe=${recipeId} PROMOTED to active`);
  } catch (err) {
    // Don't let auto-promotion derail the caller. Log loudly and move on.
    console.error(
      `[promote] recipe=${recipeId} ERROR:`,
      err instanceof Error ? err.message : err,
      err instanceof Error ? err.stack : undefined
    );
  }
}
