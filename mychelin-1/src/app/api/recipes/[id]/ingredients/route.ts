import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredients, recipes } from "@/db/schema";
import { eq, max } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recipeId = Number(id);
    const body = await request.json();

    // Verify recipe exists
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Get next sort order
    const [maxOrder] = await db
      .select({ max: max(ingredients.sortOrder) })
      .from(ingredients)
      .where(eq(ingredients.recipeId, recipeId));
    const nextOrder = (maxOrder?.max ?? -1) + 1;

    const [newIngredient] = await db
      .insert(ingredients)
      .values({
        recipeId,
        name: body.name,
        quantity: body.quantity ?? null,
        unit: body.unit ?? null,
        approximate: Boolean(body.approximate),
        quantityText: body.quantityText ?? null,
        notes: body.notes ?? null,
        sortOrder: nextOrder,
      })
      .returning();

    return NextResponse.json(newIngredient, { status: 201 });
  } catch (error) {
    console.error("POST ingredients error:", error);
    return NextResponse.json(
      { error: "Failed to add ingredient" },
      { status: 500 }
    );
  }
}
