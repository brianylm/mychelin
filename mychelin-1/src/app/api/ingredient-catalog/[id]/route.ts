import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredientCatalog } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/ingredient-catalog/:id ───────────────────────
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = Number(id);

    const item = await db.query.ingredientCatalog.findFirst({
      where: eq(ingredientCatalog.id, itemId),
    });

    if (!item) {
      return NextResponse.json(
        { error: "Ingredient catalog item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("GET /api/ingredient-catalog/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredient catalog item" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/ingredient-catalog/:id ─────────────────────
// Update an ingredient catalog item (partial update supported)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = Number(id);
    const body = await request.json();

    // Check item exists
    const existing = await db.query.ingredientCatalog.findFirst({
      where: eq(ingredientCatalog.id, itemId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Ingredient catalog item not found" },
        { status: 404 }
      );
    }

    const { name, category, defaultUnit } = body;
    const updateFields: any = {};
    
    if (name !== undefined) updateFields.name = name;
    if (category !== undefined) updateFields.category = category;
    if (defaultUnit !== undefined) updateFields.defaultUnit = defaultUnit;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    const [updatedItem] = await db
      .update(ingredientCatalog)
      .set(updateFields)
      .where(eq(ingredientCatalog.id, itemId))
      .returning();

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("PATCH /api/ingredient-catalog/[id] error:", error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: "An ingredient with this name already exists" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update ingredient catalog item" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/ingredient-catalog/:id ────────────────────
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = Number(id);

    const existing = await db.query.ingredientCatalog.findFirst({
      where: eq(ingredientCatalog.id, itemId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Ingredient catalog item not found" },
        { status: 404 }
      );
    }

    await db.delete(ingredientCatalog).where(eq(ingredientCatalog.id, itemId));

    return NextResponse.json({ message: "Ingredient catalog item deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/ingredient-catalog/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete ingredient catalog item" },
      { status: 500 }
    );
  }
}