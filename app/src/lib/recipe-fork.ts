// Fork a recipe into a user's own library (Slice 3 household import).
// Copies the LIVE recipe data (current ingredients/instructions), creates
// a v1 version snapshot, and stamps `forked_from` lineage. The copy is a
// fresh, fully-owned recipe: attempts, next-tries, comments, and ratings
// live on the copy from here on, never on the source.
//
// The public share-save flow (`/api/share/[token]/save`) keeps its own
// copy logic for the definitive-snapshot case; this helper copies live
// rows for household recipes (which may be untested/in-progress).

import { db } from "@/db";
import { ingredients, instructions, recipeVersions, recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { replaceRecipeFlagsForUser } from "@/lib/recipe-flags-db";

export async function forkRecipeToUser(
  currentUserId: number,
  sourceRecipeId: number
): Promise<{ id: number; title: string } | null> {
  const source = await db.query.recipes.findFirst({
    where: eq(recipes.id, sourceRecipeId),
    with: {
      ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
      instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
    },
  });
  if (!source) return null;

  const now = new Date().toISOString();

  const [saved] = await db
    .insert(recipes)
    .values({
      userId: currentUserId,
      title: source.title,
      description: source.description,
      cuisine: source.cuisine,
      yield: source.yield,
      prepTime: source.prepTime,
      cookTime: source.cookTime,
      story: source.story,
      imageUrl: source.imageUrl,
      isPublic: false,
      origin: source.origin,
      dialect: source.dialect,
      occasion: source.occasion,
      familyMember: source.familyMember,
      generation: source.generation,
      sourceUrl: source.sourceUrl,
      forkedFrom: source.id + ":" + source.title,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (source.ingredients.length > 0) {
    await db.insert(ingredients).values(
      source.ingredients.map((ing, index) => ({
        recipeId: saved.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        approximate: ing.approximate,
        quantityText: ing.quantityText,
        notes: ing.notes,
        sortOrder: ing.sortOrder ?? index,
      }))
    );
  }

  if (source.instructions.length > 0) {
    await db.insert(instructions).values(
      source.instructions.map((inst, index) => ({
        recipeId: saved.id,
        stepNumber: inst.stepNumber ?? index + 1,
        content: inst.content,
        tip: inst.tip,
        imageUrl: inst.imageUrl,
      }))
    );
  }

  const [version] = await db
    .insert(recipeVersions)
    .values({
      recipeId: saved.id,
      versionNumber: 1,
      versionLabel: "1",
      captureMethod: "manual",
      ingredients: JSON.stringify(source.ingredients),
      instructions: JSON.stringify(source.instructions),
      changedBy: currentUserId,
      changeNote: "Imported from a household-shared recipe",
    })
    .returning();

  await db
    .update(recipes)
    .set({ activeVersionId: version.id })
    .where(eq(recipes.id, saved.id));

  // A freshly imported shared recipe is newly added — mark it "new" until
  // its first attempt.
  await replaceRecipeFlagsForUser(currentUserId, saved.id, ["newly_added"]);

  return { id: saved.id, title: saved.title };
}
