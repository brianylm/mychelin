import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { inventory } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureHouseholdSlice2Tables,
  ensurePlanningOwnershipColumns,
} from "@/db/ensure-schema";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_LOCATIONS = ["pantry", "fridge", "freezer"];

// Household members address shared rows by id + household scope; solo
// users address their own personal rows exactly as before. A member of
// household A can never reach household B's (or a solo user's) rows.
async function resolveScope(userId: number) {
  const membership = await getUserHousehold(userId);
  return membership
    ? {
        membership,
        where: (itemId: number) =>
          and(eq(inventory.id, itemId), eq(inventory.householdId, membership.household.id)),
      }
    : {
        membership: null,
        where: (itemId: number) =>
          and(
            eq(inventory.id, itemId),
            eq(inventory.userId, userId),
            isNull(inventory.householdId)
          ),
      };
}

// ─── GET /api/inventory/:id ────────────────────────────────
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureHouseholdSlice2Tables(),
    ]);

    const { id } = await context.params;
    const itemId = Number(id);
    const scope = await resolveScope(currentUser.id);

    const item = await db.query.inventory.findFirst({
      where: scope.where(itemId),
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
// Also the manual-reconcile path: a member adjusting a quantity
// directly lands here and is attributed in the household activity feed.
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureHouseholdSlice2Tables(),
    ]);

    const { id } = await context.params;
    const itemId = Number(id);
    const body = await request.json();
    const scope = await resolveScope(currentUser.id);

    const existing = await db.query.inventory.findFirst({
      where: scope.where(itemId),
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
      .where(scope.where(itemId));

    if (scope.membership) {
      await logHouseholdActivity(
        scope.membership.household.id,
        currentUser.id,
        "edited_item",
        existing.name
      );
    }

    const updatedItem = await db.query.inventory.findFirst({
      where: scope.where(itemId),
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

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureHouseholdSlice2Tables(),
    ]);

    const { id } = await context.params;
    const itemId = Number(id);
    const scope = await resolveScope(currentUser.id);

    const existing = await db.query.inventory.findFirst({
      where: scope.where(itemId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    await db.delete(inventory).where(scope.where(itemId));

    if (scope.membership) {
      await logHouseholdActivity(
        scope.membership.household.id,
        currentUser.id,
        "removed_item",
        existing.name
      );
    }

    return NextResponse.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/inventory/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
