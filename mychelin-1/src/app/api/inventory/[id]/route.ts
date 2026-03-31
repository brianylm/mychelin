import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventory } from "@/db/schema";
import { eq } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/inventory/:id ────────────────────────────────
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = Number(id);

    const item = await db.query.inventory.findFirst({
      where: eq(inventory.id, itemId),
      with: {
        catalogIngredient: {
          columns: { id: true, name: true, category: true, defaultUnit: true }
        }
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("GET /api/inventory/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/inventory/:id ──────────────────────────────
// Update an inventory item (partial update supported)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = Number(id);
    const body = await request.json();

    // Check item exists
    const existing = await db.query.inventory.findFirst({
      where: eq(inventory.id, itemId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const { catalogIngredientId, name, quantity, unit, location, expiryDate } = body;
    const updateFields: any = {};
    
    if (catalogIngredientId !== undefined) {
      updateFields.catalogIngredientId = catalogIngredientId ? Number(catalogIngredientId) : null;
    }
    if (name !== undefined) updateFields.name = name;
    if (quantity !== undefined) updateFields.quantity = Number(quantity);
    if (unit !== undefined) updateFields.unit = unit;
    if (location !== undefined) {
      // Validate location if provided
      if (location && !["pantry", "fridge", "freezer"].includes(location)) {
        return NextResponse.json(
          { error: "Invalid location. Must be one of: pantry, fridge, freezer" },
          { status: 400 }
        );
      }
      updateFields.location = location;
    }
    if (expiryDate !== undefined) {
      // Validate expiry date format if provided
      if (expiryDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(expiryDate)) {
          return NextResponse.json(
            { error: "Invalid expiry date format. Use YYYY-MM-DD" },
            { status: 400 }
          );
        }
      }
      updateFields.expiryDate = expiryDate;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    // Add updated timestamp
    updateFields.updatedAt = new Date().toISOString();

    await db
      .update(inventory)
      .set(updateFields)
      .where(eq(inventory.id, itemId));

    // Return updated inventory item with catalog details
    const updatedItem = await db.query.inventory.findFirst({
      where: eq(inventory.id, itemId),
      with: {
        catalogIngredient: {
          columns: { id: true, name: true, category: true, defaultUnit: true }
        }
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("PATCH /api/inventory/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/inventory/:id ─────────────────────────────
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = Number(id);

    const existing = await db.query.inventory.findFirst({
      where: eq(inventory.id, itemId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    await db.delete(inventory).where(eq(inventory.id, itemId));

    return NextResponse.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/inventory/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}