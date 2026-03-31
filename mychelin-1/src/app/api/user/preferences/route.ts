import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const preferredRegion = "hnd1";

// ─── GET /api/user/preferences ──────────────────────────────
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const favoriteCuisines = user.favoriteCuisines 
      ? JSON.parse(user.favoriteCuisines) 
      : [];
    
    const dietaryRestrictions = user.dietaryRestrictions 
      ? JSON.parse(user.dietaryRestrictions) 
      : [];

    return NextResponse.json({
      name: user.name,
      email: user.email,
      cookingSkillLevel: user.cookingSkillLevel,
      householdSize: user.householdSize,
      favoriteCuisines,
      dietaryRestrictions,
    });
  } catch (error) {
    console.error("GET /api/user/preferences error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/user/preferences ────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      cookingSkillLevel,
      householdSize,
      favoriteCuisines = [],
      dietaryRestrictions = [],
    } = body;

    // Update user preferences
    await db
      .update(users)
      .set({
        name: name || null,
        cookingSkillLevel: cookingSkillLevel || null,
        householdSize: householdSize || null,
        favoriteCuisines: JSON.stringify(favoriteCuisines),
        dietaryRestrictions: JSON.stringify(dietaryRestrictions),
      })
      .where(eq(users.id, currentUser.id));

    return NextResponse.json({ message: "Preferences updated successfully" });
  } catch (error) {
    console.error("PATCH /api/user/preferences error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}