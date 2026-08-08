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

// ─── POST /api/shopping-list/tick ──────────────────────────
// Household-only: ticking marks an item bought (step 1 of the 2-step
// flow) and never touches inventory. The tick row snapshots the item's
// display data so the move step works even if the plan changes after
// the tick. { ticked: false } lifts the tick.
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
    const key = typeof body.key === "string" ? body.key : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!key || !name) {
      return NextResponse.json(
        { error: "key and name are required" },
        { status: 400 }
      );
    }
    const ticked = body.ticked !== false;

    const scope = and(
      eq(shoppingListItems.householdId, householdId),
      eq(shoppingListItems.itemKey, key)
    );
    const [existing] = await db
      .select()
      .from(shoppingListItems)
      .where(scope)
      .limit(1);

    if (!ticked) {
      // Untick: generated rows disappear entirely; manual rows stay on
      // the list (they ARE the list entry) with the tick cleared.
      if (existing) {
        if (existing.source === "manual") {
          await db
            .update(shoppingListItems)
            .set({ tickedAt: null, tickedBy: null })
            .where(scope);
        } else if (!existing.movedAt) {
          await db.delete(shoppingListItems).where(scope);
        }
      }
      return NextResponse.json({ ticked: false });
    }

    if (existing?.movedAt) {
      // Already moved to inventory — the tick is informational only.
      return NextResponse.json({ ticked: true, alreadyMoved: true });
    }

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(shoppingListItems)
        .set({ tickedAt: now, tickedBy: currentUser.id })
        .where(scope);
    } else {
      await db.insert(shoppingListItems).values({
        householdId,
        itemKey: key,
        name,
        category: typeof body.category === "string" ? body.category : null,
        unit: typeof body.unit === "string" ? body.unit : "",
        quantity:
          typeof body.quantity === "number" && Number.isFinite(body.quantity)
            ? body.quantity
            : null,
        approximate: Boolean(body.approximate),
        source: "generated",
        catalogIngredientId:
          body.catalogIngredientId != null ? Number(body.catalogIngredientId) : null,
        tickedAt: now,
        tickedBy: currentUser.id,
      });
    }

    await logHouseholdActivity(householdId, currentUser.id, "ticked_shopping_item", name);

    return NextResponse.json({ ticked: true });
  } catch (error) {
    console.error("POST /api/shopping-list/tick error:", error);
    return NextResponse.json(
      { error: "Failed to tick item" },
      { status: 500 }
    );
  }
}
