import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredientCatalog } from "@/db/schema";
import { asc } from "drizzle-orm";

export const preferredRegion = "hnd1";

// ─── GET /api/ingredient-catalog ───────────────────────────
// Returns all ingredient catalog items
export async function GET() {
  try {
    const allItems = await db.query.ingredientCatalog.findMany({
      orderBy: [asc(ingredientCatalog.category), asc(ingredientCatalog.name)],
    });

    return NextResponse.json(allItems);
  } catch (error) {
    console.error("GET /api/ingredient-catalog error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredient catalog" },
      { status: 500 }
    );
  }
}

// ─── POST /api/ingredient-catalog ──────────────────────────
// Creates a new ingredient catalog item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, defaultUnit } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const [newItem] = await db
      .insert(ingredientCatalog)
      .values({
        name,
        category,
        defaultUnit,
      })
      .returning();

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("POST /api/ingredient-catalog error:", error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: "An ingredient with this name already exists" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create ingredient catalog item" },
      { status: 500 }
    );
  }
}