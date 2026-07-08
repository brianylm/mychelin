import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe, canUserEditRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string; ingredientId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, ingredientId } = await context.params;

    if (!(await canUserAccessRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    if (!(await canUserEditRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe ingredients" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const [updated] = await db
      .update(ingredients)
      .set(body)
      .where(
        and(
          eq(ingredients.id, Number(ingredientId)),
          eq(ingredients.recipeId, Number(id))
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to update ingredient" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, ingredientId } = await context.params;

    if (!(await canUserAccessRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    if (!(await canUserEditRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe ingredients" },
        { status: 403 }
      );
    }

    const [deleted] = await db
      .delete(ingredients)
      .where(
        and(
          eq(ingredients.id, Number(ingredientId)),
          eq(ingredients.recipeId, Number(id))
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to delete ingredient" },
      { status: 500 }
    );
  }
}
