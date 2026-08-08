import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { inventory, shoppingListItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureHouseholdSlice2Tables } from "@/db/ensure-schema";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";
import {
  buildMovePlan,
  groupMovesAgainstInventory,
  partitionForMove,
  type MoveOverride,
} from "@/lib/household-shopping";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/shopping-list/move-to-inventory ─────────────
// Step 2 of the 2-step flow: pushes ticked items into the shared
// inventory. Edit-before-confirm happens client-side and lands here as
// per-key quantity/unit overrides.
//
// Idempotent by construction: only rows with ticked_at set and
// moved_at NULL are pushed, and each pushed row is stamped moved_at in
// the same request — pushing twice cannot double-add. Already-moved
// rows are returned in `alreadyMoved` so the UI can show them as such.
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

    const body = await request.json().catch(() => ({}));
    const overrides: Record<string, MoveOverride> =
      body && typeof body.overrides === "object" && body.overrides !== null
        ? body.overrides
        : {};

    const rows = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.householdId, householdId));

    const { pending, alreadyMoved } = partitionForMove(rows);
    const { moves, skipped } = buildMovePlan(pending, overrides);

    const inventoryRows = await db
      .select({
        id: inventory.id,
        name: inventory.name,
        unit: inventory.unit,
        quantity: inventory.quantity,
        catalogIngredientId: inventory.catalogIngredientId,
      })
      .from(inventory)
      .where(eq(inventory.householdId, householdId));

    const { increments, inserts } = groupMovesAgainstInventory(
      moves.map((move) => ({ ...move, quantity: move.quantity! })),
      inventoryRows
    );

    const now = new Date().toISOString();

    for (const increment of increments) {
      const row = inventoryRows.find((r) => r.id === increment.inventoryId);
      if (!row) continue;
      await db
        .update(inventory)
        .set({ quantity: row.quantity + increment.add, updatedAt: now })
        .where(and(eq(inventory.id, increment.inventoryId), eq(inventory.householdId, householdId)));
    }
    for (const insert of inserts) {
      await db.insert(inventory).values({
        userId: currentUser.id,
        householdId,
        catalogIngredientId: insert.catalogIngredientId,
        name: insert.name,
        quantity: insert.quantity,
        unit: insert.unit,
      });
    }

    // Stamp the moved rows in the same request — this is what makes a
    // repeat push a no-op.
    for (const move of moves) {
      await db
        .update(shoppingListItems)
        .set({ movedAt: now, movedBy: currentUser.id })
        .where(and(eq(shoppingListItems.id, move.stateId), isNull(shoppingListItems.movedAt)));
    }

    if (moves.length > 0) {
      await logHouseholdActivity(
        householdId,
        currentUser.id,
        "moved_to_inventory",
        moves.map((move) => move.name).join(", ")
      );
    }

    return NextResponse.json({
      moved: moves.map((move) => ({
        key: move.itemKey,
        name: move.name,
        quantity: move.quantity,
        unit: move.unit,
      })),
      skipped: skipped.map((row) => ({ key: row.itemKey, name: row.name })),
      alreadyMoved: alreadyMoved.map((row) => ({
        key: row.itemKey,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        movedAt: row.movedAt,
      })),
    });
  } catch (error) {
    console.error("POST /api/shopping-list/move-to-inventory error:", error);
    return NextResponse.json(
      { error: "Failed to move items to inventory" },
      { status: 500 }
    );
  }
}
