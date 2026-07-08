import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes, ingredients, instructions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { maybePromoteDraftToActive } from "@/lib/recipe-promotion";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe, canUserEditRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/recipes/:id ──────────────────────────────────
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      with: {
        ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
        instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
        voiceRecordings: { orderBy: (v, { asc }) => [asc(v.sortOrder)] },
        photos: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("GET /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/recipes/:id ────────────────────────────────
// Update a recipe (partial update supported)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    if (!(await canUserEditRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Check recipe exists
    const existing = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    const {
      ingredients: ingredientsList,
      instructions: instructionsList,
      ...recipeFields
    } = body;

    // Validate status if included in the update.
    if (
      recipeFields.status !== undefined &&
      recipeFields.status !== "active" &&
      recipeFields.status !== "draft"
    ) {
      return NextResponse.json(
        { error: "status must be 'active' or 'draft'" },
        { status: 400 }
      );
    }

    // Update recipe fields if any provided
    if (Object.keys(recipeFields).length > 0) {
      await db
        .update(recipes)
        .set({
          ...recipeFields,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(recipes.id, recipeId));
    }

    // Replace ingredients if provided (delete + re-insert)
    if (ingredientsList !== undefined) {
      await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
      if (ingredientsList.length > 0) {
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
              recipeId,
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
    }

    // Replace instructions if provided (delete + re-insert)
    if (instructionsList !== undefined) {
      await db
        .delete(instructions)
        .where(eq(instructions.recipeId, recipeId));
      if (instructionsList.length > 0) {
        await db.insert(instructions).values(
          instructionsList.map(
            (
              inst: { content: string; tip?: string; imageUrl?: string },
              idx: number
            ) => ({
              recipeId,
              stepNumber: idx + 1,
              content: inst.content,
              tip: inst.tip,
              imageUrl: inst.imageUrl,
            })
          )
        );
      }
    }

    // Auto-promote the recipe from draft to active if it now qualifies.
    // Relevant when the caller updated the title — if the title just became
    // real and the recipe already had ingredients/instructions, promote it.
    await maybePromoteDraftToActive(recipeId);

    // Return updated recipe
    const updatedRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      with: {
        ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
        instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
      },
    });

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    console.error("PATCH /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/recipes/:id ──────────────────────────────────
// Full replacement of a recipe
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    if (!(await canUserEditRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const existing = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    const {
      title,
      description,
      cuisine,
      yield: recipeYield,
      prepTime,
      cookTime,
      story,
      imageUrl,
      isPublic,
      sourceUrl,
      ingredients: ingredientsList,
      instructions: instructionsList,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Full update of recipe fields
    await db
      .update(recipes)
      .set({
        title,
        description: description ?? null,
        cuisine: cuisine ?? null,
        yield: recipeYield ?? null,
        prepTime: prepTime ?? null,
        cookTime: cookTime ?? null,
        story: story ?? null,
        imageUrl: imageUrl ?? null,
        isPublic: isPublic ?? false,
        sourceUrl: sourceUrl ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(recipes.id, recipeId));

    // Replace ingredients
    await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
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
            recipeId,
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

    // Replace instructions
    await db.delete(instructions).where(eq(instructions.recipeId, recipeId));
    if (instructionsList?.length) {
      await db.insert(instructions).values(
        instructionsList.map(
          (
            inst: { content: string; tip?: string; imageUrl?: string },
            idx: number
          ) => ({
            recipeId,
            stepNumber: idx + 1,
            content: inst.content,
            tip: inst.tip,
            imageUrl: inst.imageUrl,
          })
        )
      );
    }

    // Return full updated recipe
    const updatedRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      with: {
        ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
        instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
      },
    });

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    console.error("PUT /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to replace recipe" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/recipes/:id ───────────────────────────────
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    if (!(await canUserEditRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe" },
        { status: 403 }
      );
    }

    const existing = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Cascade delete handles ingredients & instructions
    await db.delete(recipes).where(eq(recipes.id, recipeId));

    return NextResponse.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
