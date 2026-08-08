import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { shoppingListItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureHouseholdSlice2Tables } from "@/db/ensure-schema";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";

export const runtime = "edge";
export const preferredRegion = "hnd1";

function manualKey(name: string, unit: string): string {
  return (
    "manual_" +
    (name || "").trim().toLowerCase() +
    "_" +
    (unit || "").trim().toLowerCase()
  );
}

// ─── POST /api/shopping-list/items ─────────────────────────
// Household-only manual add. Re-adding the same name+unit refreshes the
// quantity instead of duplicating (unique household+key).
export async function POST(request: NextRequest) {
  try {
    if (!HOUSEHOLDS_ENABLED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureHouseholdSlice2Tables();

    const membership = await getUserHousehold(currentUser.id);
    if (!membership) {
      return NextResponse.json(
        { error: "You're not in a household" },
        { status: 404 }
      );
    }
    const householdId = membership.household.id;

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const quantity =
      body.quantity === undefined || body.quantity === null
        ? null
        : Number(body.quantity);
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    const key = manualKey(name, unit);
    const scope = and(
      eq(shoppingListItems.householdId, householdId),
      eq(shoppingListItems.itemKey, key)
    );
    const [existing] = await db
      .select()
      .from(shoppingListItems)
      .where(scope)
      .limit(1);

    if (existing) {
      // Re-adding the same item refreshes it — including resurrecting a
      // previously moved row as a fresh buy (the unique index is on
      // household+key, so update, never double-insert).
      await db
        .update(shoppingListItems)
        .set({ quantity, tickedAt: null, tickedBy: null, movedAt: null, movedBy: null })
        .where(scope);
    } else {
      await db.insert(shoppingListItems).values({
        householdId,
        itemKey: key,
        name,
        category: typeof body.category === "string" ? body.category : null,
        unit,
        quantity,
        approximate: quantity == null,
        source: "manual",
      });
    }

    await logHouseholdActivity(householdId, currentUser.id, "added_shopping_item", name);

    return NextResponse.json({ key, name, quantity, unit }, { status: 201 });
  } catch (error) {
    console.error("POST /api/shopping-list/items error:", error);
    return NextResponse.json(
      { error: "Failed to add shopping item" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/shopping-list/items ───────────────────────
// Removes a manual add. Generated items can't be removed here — they
// disappear when the plan changes (or when they're moved to inventory).
export async function DELETE(request: NextRequest) {
  try {
    if (!HOUSEHOLDS_ENABLED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureHouseholdSlice2Tables();

    const membership = await getUserHousehold(currentUser.id);
    if (!membership) {
      return NextResponse.json(
        { error: "You're not in a household" },
        { status: 404 }
      );
    }
    const householdId = membership.household.id;

    const body = await request.json();
    const key = typeof body.key === "string" ? body.key : "";
    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const scope = and(
      eq(shoppingListItems.householdId, householdId),
      eq(shoppingListItems.itemKey, key),
      eq(shoppingListItems.source, "manual")
    );
    const [existing] = await db
      .select()
      .from(shoppingListItems)
      .where(scope)
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await db.delete(shoppingListItems).where(scope);

    await logHouseholdActivity(householdId, currentUser.id, "removed_shopping_item", existing.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/shopping-list/items error:", error);
    return NextResponse.json(
      { error: "Failed to remove shopping item" },
      { status: 500 }
    );
  }
}
