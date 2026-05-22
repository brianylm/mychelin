import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  shareLinks,
  recipes,
  ingredients,
  instructions,
  recipeVersions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ token: string }> };

// POST /api/share/[token]/save
//
// Save (fork) a shared recipe into the authenticated user's collection.
// Access is via the share token, not via recipe ownership — this is the
// public-page "Save to my Mychelin" flow.
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await context.params;

    const [link] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.token, token))
      .limit(1);

    if (!link || link.resourceType !== "recipe") {
      return NextResponse.json(
        { error: "Share link not found or not a recipe" },
        { status: 404 }
      );
    }

    const original = await db.query.recipes.findFirst({
      where: eq(recipes.id, link.resourceId),
      with: {
        ingredients: { orderBy: (ing, { asc }) => [asc(ing.sortOrder)] },
        instructions: { orderBy: (inst, { asc }) => [asc(inst.stepNumber)] },
      },
    });

    if (!original) {
      return NextResponse.json(
        { error: "Original recipe not found" },
        { status: 404 }
      );
    }

    // Don't let users save their own recipe
    if (original.userId === currentUser.id) {
      return NextResponse.json(
        { error: "This is already your recipe" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const [saved] = await db
      .insert(recipes)
      .values({
        userId: currentUser.id,
        title: original.title,
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
        sourceUrl: original.sourceUrl,
        forkedFrom: `${original.id}:${original.title}`,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (original.ingredients.length > 0) {
      await db.insert(ingredients).values(
        original.ingredients.map((ing) => ({
          recipeId: saved.id,
          catalogIngredientId: ing.catalogIngredientId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          approximate: ing.approximate,
          quantityText: ing.quantityText,
          notes: ing.notes,
          sortOrder: ing.sortOrder,
        }))
      );
    }

    if (original.instructions.length > 0) {
      await db.insert(instructions).values(
        original.instructions.map((inst) => ({
          recipeId: saved.id,
          stepNumber: inst.stepNumber,
          content: inst.content,
          tip: inst.tip,
          imageUrl: inst.imageUrl,
        }))
      );
    }

    // Create initial version
    const [version] = await db
      .insert(recipeVersions)
      .values({
        recipeId: saved.id,
        versionNumber: 1,
        versionLabel: "1",
        captureMethod: "manual",
        ingredients: JSON.stringify(
          original.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            approximate: ing.approximate,
            quantityText: ing.quantityText,
            notes: ing.notes,
          }))
        ),
        instructions: JSON.stringify(
          original.instructions.map((inst) => ({
            content: inst.content,
            tip: inst.tip,
            imageUrl: inst.imageUrl,
          }))
        ),
        changedBy: currentUser.id,
        changeNote: "Saved from shared recipe",
      })
      .returning();

    await db
      .update(recipes)
      .set({ activeVersionId: version.id })
      .where(eq(recipes.id, saved.id));

    return NextResponse.json(
      { id: saved.id, title: saved.title },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/share/[token]/save error:", error);
    return NextResponse.json(
      { error: "Failed to save recipe" },
      { status: 500 }
    );
  }
}
