import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ingredients, instructions, recipes } from "@/db/schema";
import { sql } from "drizzle-orm";

/**
 * Server-side auto-promotion of draft recipes.
 *
 * A draft becomes "active" as soon as it satisfies BOTH:
 *   1. A real title (non-empty and not the "Untitled recipe" placeholder)
 *   2. At least one ingredient OR instruction
 *
 * Called from the endpoints that can make a draft satisfy these
 * conditions: POST /api/recipes/:id/ingredients, POST /api/recipes/:id/
 * instructions, and PATCH /api/recipes/:id (on title update).
 *
 * Idempotent and no-op for already-active recipes. Failure is swallowed
 * so the calling endpoint's primary operation isn't derailed — a stale
 * draft status is recoverable, but a 500 on adding an ingredient isn't.
 */
export async function maybePromoteDraftToActive(recipeId: number): Promise<void> {
  try {
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      columns: { id: true, title: true, status: true },
    });
    if (!recipe) return;
    if (recipe.status !== "draft") return;

    const title = (recipe.title ?? "").trim();
    const hasRealTitle = title !== "" && title !== "Untitled recipe";
    if (!hasRealTitle) return;

    // Count ingredients and instructions in parallel to avoid two round-trips.
    const [ingCount, instCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(ingredients)
        .where(eq(ingredients.recipeId, recipeId))
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(instructions)
        .where(eq(instructions.recipeId, recipeId))
        .then((rows) => Number(rows[0]?.count ?? 0)),
    ]);

    if (ingCount === 0 && instCount === 0) return;

    await db
      .update(recipes)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(recipes.id, recipeId));
  } catch (err) {
    // Don't let auto-promotion derail the caller. Log and move on.
    console.error("maybePromoteDraftToActive failed:", err);
  }
}
