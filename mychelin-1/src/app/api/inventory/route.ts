import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventory } from "@/db/schema";
import { eq } from "drizzle-orm";

export const preferredRegion = "hnd1";

// ─── GET /api/inventory ────────────────────────────────────
// Returns inventory items with optional location filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");

    const items = await db.query.inventory.findMany({
      where: location ? eq(inventory.location, location) : undefined,
      with: {
        catalogIngredient: {
          columns: { id: true, name: true, category: true, defaultUnit: true }
        }
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
// Creates a new inventory item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { catalogIngredientId, name, quantity, unit, location, expiryDate } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: "Quantity is required" },
        { status: 400 }
      );
    }

    if (!unit) {
      return NextResponse.json(
        { error: "Unit is required" },
        { status: 400 }
      );
    }

    // Validate location if provided
    if (location) {
      const validLocations = ["pantry", "fridge", "freezer"];
      if (!validLocations.includes(location)) {
        return NextResponse.json(
          { error: "Invalid location. Must be one of: pantry, fridge, freezer" },
          { status: 400 }
        );
      }
    }

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

    const [newItem] = await db
      .insert(inventory)
      .values({
        catalogIngredientId: catalogIngredientId ? Number(catalogIngredientId) : null,
        name,
        quantity: Number(quantity),
        unit,
        location,
        expiryDate,
      })
      .returning();

    // Return the inventory item with catalog details if linked
    const fullItem = await db.query.inventory.findFirst({
      where: eq(inventory.id, newItem.id),
      with: {
        catalogIngredient: {
          columns: { id: true, name: true, category: true, defaultUnit: true }
        }
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