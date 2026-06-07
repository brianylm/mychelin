import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventory } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensurePlanningOwnershipColumns } from "@/db/ensure-schema";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_LOCATIONS = ["pantry", "fridge", "freezer"];

// ─── GET /api/inventory/:id ────────────────────────────────
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();

    const { id } = await context.params;
    const itemId = Number(id);

    const item = await db.query.inventory.findFirst({
      where: and(eq(inventory.id, itemId), eq(inventory.userId, currentUser.id)),
      with: {
        catalogIngredient: {
          columns: { id: true, name: true, category: true, defaultUnit: true },
        },
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
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();

    const { id } = await context.params;
    const itemId = Number(id);
    const body = await request.json();

    const existing = await db.query.inventory.findFirst({
      where: and(eq(inventory.id, itemId), eq(inventory.userId, currentUser.id)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const { catalogIngredientId, name, quantity, unit, location, expiryDate } = body;
    const updateFields: Partial<typeof inventory.$inferInsert> = {};

    if (catalogIngredientId !== undefined) {
      updateFields.catalogIngredientId = catalogIngredientId ? Number(catalogIngredientId) : null;
    }
    if (name !== undefined) updateFields.name = name;
    if (quantity !== undefined) updateFields.quantity = Number(quantity);
    if (unit !== undefined) updateFields.unit = unit;
    if (location !== undefined) {
      if (location && !VALID_LOCATIONS.includes(location)) {
        return NextResponse.json(
          { error: "Invalid location. Must be one of: pantry, fridge, freezer" },
          { status: 400 }
        );
      }
      updateFields.location = location;
    }
    if (expiryDate !== undefined) {
      if (expiryDate && !DATE_RE.test(expiryDate)) {
        return NextResponse.json(
          { error: "Invalid expiry date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      updateFields.expiryDate = expiryDate;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    updateFields.updatedAt = new Date().toISOString();

    await db
      .update(inventory)
      .set(updateFields)
      .where(and(eq(inventory.id, itemId), eq(inventory.userId, currentUser.id)));

    const updatedItem = await db.query.inventory.findFirst({
      where: and(eq(inventory.id, itemId), eq(inventory.userId, currentUser.id)),
      with: {
        catalogIngredient: {
          columns: { id: true, name: true, category: true, defaultUnit: true },
        },
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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();

    const { id } = await context.params;
    const itemId = Number(id);

    const existing = await db.query.inventory.findFirst({
      where: and(eq(inventory.id, itemId), eq(inventory.userId, currentUser.id)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    await db
      .delete(inventory)
      .where(and(eq(inventory.id, itemId), eq(inventory.userId, currentUser.id)));

    return NextResponse.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/inventory/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
