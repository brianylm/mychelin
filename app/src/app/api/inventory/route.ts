import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventory } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensurePlanningOwnershipColumns } from "@/db/ensure-schema";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_LOCATIONS = ["pantry", "fridge", "freezer"];

// ─── GET /api/inventory ────────────────────────────────────
// Returns inventory items owned by the current user.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();

    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");

    const items = await db.query.inventory.findMany({
      where: location
        ? and(eq(inventory.userId, currentUser.id), eq(inventory.location, location))
        : eq(inventory.userId, currentUser.id),
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
// Creates a new inventory item for the current user.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlanningOwnershipColumns();

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
        catalogIngredientId: catalogIngredientId ? Number(catalogIngredientId) : null,
        name,
        quantity: Number(quantity),
        unit,
        location,
        expiryDate,
      })
      .returning();

    const fullItem = await db.query.inventory.findFirst({
      where: and(eq(inventory.id, newItem.id), eq(inventory.userId, currentUser.id)),
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
