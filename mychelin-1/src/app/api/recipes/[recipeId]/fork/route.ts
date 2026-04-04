import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, ingredients, instructions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ recipeId: string }> };

// ─── POST /api/recipes/[recipeId]/fork ─────────────────────
// Fork a recipe — copies recipe + ingredients + instructions to a new recipe
export async function POST(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await params;
    const recipeIdNum = parseInt(recipeId);

    // Fetch original recipe with ingredients and instructions
    const original = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeIdNum),
      with: {
        ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
        instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Insert forked recipe
    const [forkedRecipe] = await db
      .insert(recipes)
      .values({
        userId: currentUser.id,
        title: `${original.title} (Fork)`,
        description: original.description,
        cuisine: original.cuisine,
        yield: original.yield,
        prepTime: original.prepTime,
        cookTime: original.cookTime,
        story: original.story,
        imageUrl: original.imageUrl,
        isPublic: false,
        origin: original.origin,
        dialect: original.dialect,
        occasion: original.occasion,
        familyMember: original.familyMember,
        generation: original.generation,
        forkedFrom: String(original.id),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Copy ingredients
    if (original.ingredients.length > 0) {
      await db.insert(ingredients).values(
        original.ingredients.map((ing) => ({
          recipeId: forkedRecipe.id,
          catalogIngredientId: ing.catalogIngredientId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
          sortOrder: ing.sortOrder,
        }))
      );
    }

    // Copy instructions
    if (original.instructions.length > 0) {
      await db.insert(instructions).values(
        original.instructions.map((inst) => ({
          recipeId: forkedRecipe.id,
          stepNumber: inst.stepNumber,
          content: inst.content,
          tip: inst.tip,
          imageUrl: inst.imageUrl,
        }))
      );
    }

    return NextResponse.json(forkedRecipe, { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes/[recipeId]/fork error:", error);
    return NextResponse.json({ error: "Failed to fork recipe" }, { status: 500 });
  }
}
