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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_LOCATIONS = ["pantry", "fridge", "freezer"];

// ─── GET /api/inventory ────────────────────────────────────
// Household members get the household's shared rows (any member can
// add/edit/decrement them); solo users get exactly the per-user rows
// they always had. Personal rows from before joining a household stay
// personal (household_id IS NULL) and are simply not part of the shared
// inventory while the user is in one.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureHouseholdSlice2Tables(),
    ]);

    const membership = await getUserHousehold(currentUser.id);

    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");

    const scope = membership
      ? eq(inventory.householdId, membership.household.id)
      : and(eq(inventory.userId, currentUser.id), isNull(inventory.householdId));

    const items = await db.query.inventory.findMany({
      where: location
        ? and(scope, eq(inventory.location, location))
        : scope,
      with: {
        catalogIngredient: {
          columns: { id: true, name: true, category: true, defaultUnit: true },
        },
      },
      orderBy: (inv, { asc }) => [asc(inv.name)],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

// ─── POST /api/inventory ───────────────────────────────────
// Creates a new inventory item. In a household the row lands on the
// shared inventory (userId records who added it) and the activity feed
// attributes the add; for solo users nothing changes.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureHouseholdSlice2Tables(),
    ]);

    const membership = await getUserHousehold(currentUser.id);

    const body = await request.json();
    const { catalogIngredientId, name, quantity, unit, location, expiryDate } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: "Quantity is required" },
        { status: 400 }
      );
    }
    if (!unit) {
      return NextResponse.json({ error: "Unit is required" }, { status: 400 });
    }
    if (location && !VALID_LOCATIONS.includes(location)) {
      return NextResponse.json(
        { error: "Invalid location. Must be one of: pantry, fridge, freezer" },
        { status: 400 }
      );
    }
    if (expiryDate && !DATE_RE.test(expiryDate)) {
      return NextResponse.json(
        { error: "Invalid expiry date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const [newItem] = await db
      .insert(inventory)
      .values({
        userId: currentUser.id,
        householdId: membership?.household.id ?? null,
        catalogIngredientId: catalogIngredientId ? Number(catalogIngredientId) : null,
        name,
        quantity: Number(quantity),
        unit,
        location,
        expiryDate,
      })
      .returning();

    if (membership) {
      await logHouseholdActivity(
        membership.household.id,
        currentUser.id,
        "added_item",
        name
      );
    }

    const scope = membership
      ? and(eq(inventory.id, newItem.id), eq(inventory.householdId, membership.household.id))
      : and(eq(inventory.id, newItem.id), eq(inventory.userId, currentUser.id));

    const fullItem = await db.query.inventory.findFirst({
      where: scope,
      with: {
        catalogIngredient: {
          columns: { id: true, name: true, category: true, defaultUnit: true },
        },
      },
    });

    return NextResponse.json(fullItem, { status: 201 });
  } catch (error) {
    console.error("POST /api/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}
