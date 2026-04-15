import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  recipes,
  ingredients,
  instructions,
  recipeVersions,
  bookMembers,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureVersionLabelColumn } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import {
  canUserAccessRecipe,
  ensureRecipeOwnershipBackfill,
  recipesVisibleTo,
} from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── GET /api/recipes ──────────────────────────────────────
// Returns recipes the current user owns or has access to via book
// membership. Never returns other users' private recipes.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // One-shot backfill: claim any legacy NULL-owner recipes for the
    // original (lowest-id) user. Runs once per warm container.
    await ensureRecipeOwnershipBackfill();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Single recipe with relations — must pass access check
      const recipeId = Number(id);
      const allowed = await canUserAccessRecipe(currentUser.id, recipeId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Recipe not found" },
          { status: 404 }
        );
      }

      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, recipeId),
        with: {
          ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
          instructions: {
            orderBy: (inst, { asc }) => [asc(inst.stepNumber)],
          },
        },
      });

      return NextResponse.json(recipe);
    }

    // All recipes the current user can see (without nested relations)
    const allRecipes = await db
      .select()
      .from(recipes)
      .where(recipesVisibleTo(currentUser.id))
      .orderBy(recipes.createdAt);

    // Match the previous order (newest first) without relying on a desc
    // helper import — reverse in-memory since the result set is small.
    return NextResponse.json(allRecipes.reverse());
  } catch (error) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

// ─── POST /api/recipes ─────────────────────────────────────
// Creates a new recipe with optional ingredients and instructions
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureVersionLabelColumn();
    const body = await request.json();
    const {
      title,
      status,
      description,
      cuisine,
      yield: recipeYield,
      prepTime,
      cookTime,
      story,
      imageUrl,
      isPublic,
      bookId,
      ingredients: ingredientsList,
      instructions: instructionsList,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Validate status if provided. Default is "active" (matches schema).
    if (status !== undefined && status !== "active" && status !== "draft") {
      return NextResponse.json(
        { error: "status must be 'active' or 'draft'" },
        { status: 400 }
      );
    }

    // If a bookId is supplied, the user must be a member of that book —
    // otherwise creating a recipe under it would be a write into someone
    // else's collection.
    if (bookId != null) {
      const membership = await db
        .select({ id: bookMembers.id })
        .from(bookMembers)
        .where(
          and(
            eq(bookMembers.bookId, bookId),
            eq(bookMembers.userId, currentUser.id)
          )
        )
        .limit(1);
      if (!membership.length) {
        return NextResponse.json(
          { error: "You don't have access to that book" },
          { status: 403 }
        );
      }
    }

    // Insert recipe — always stamped with the current user as owner.
    const [newRecipe] = await db
      .insert(recipes)
      .values({
        userId: currentUser.id,
        title,
        status: status ?? "active",
        description,
        cuisine,
        yield: recipeYield,
        prepTime,
        cookTime,
        story,
        imageUrl,
        isPublic: isPublic ?? false,
        bookId: bookId ?? null,
      })
      .returning();

    // Insert ingredients if provided
    if (ingredientsList?.length) {
      await db.insert(ingredients).values(
        ingredientsList.map(
          (
            ing: {
              name: string;
              quantity?: number;
              unit?: string;
              approximate?: boolean;
              quantityText?: string;
              notes?: string;
            },
            idx: number
          ) => ({
            recipeId: newRecipe.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            approximate: Boolean(ing.approximate),
            quantityText: ing.quantityText ?? null,
            notes: ing.notes,
            sortOrder: idx,
          })
        )
      );
    }

    // Insert instructions if provided
    if (instructionsList?.length) {
      await db.insert(instructions).values(
        instructionsList.map(
          (
            inst: { content: string; tip?: string; imageUrl?: string },
            idx: number
          ) => ({
            recipeId: newRecipe.id,
            stepNumber: idx + 1,
            content: inst.content,
            tip: inst.tip,
            imageUrl: inst.imageUrl,
          })
        )
      );
    }

    // Auto-create version 1 — this is what cook-along uses
    const [v1] = await db
      .insert(recipeVersions)
      .values({
        recipeId: newRecipe.id,
        versionNumber: 1,
        versionLabel: "1",
        captureMethod: "manual",
        ingredients: ingredientsList ? JSON.stringify(ingredientsList) : JSON.stringify([]),
        instructions: instructionsList ? JSON.stringify(instructionsList) : JSON.stringify([]),
        changeNote: "Initial version",
      })
      .returning();

    // Point the recipe's activeVersionId at v1
    await db
      .update(recipes)
      .set({ activeVersionId: v1.id })
      .where(eq(recipes.id, newRecipe.id));

    // Return complete recipe
    const fullRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, newRecipe.id),
      with: {
        ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
        instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
      },
    });

    return NextResponse.json(fullRecipe, { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
