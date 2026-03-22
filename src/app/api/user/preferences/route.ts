import { NextRequest, NextResponse } from "next/server";
import { db, userPreferences } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

// GET /api/user/preferences
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  return NextResponse.json({ preferences: prefs || null });
}

// PUT /api/user/preferences
export async function PUT(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { favoriteCuisines, dietaryRestrictions, cookingSkillLevel, householdSize } = body;

    // Check if preferences already exist
    const existing = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (existing) {
      await db
        .update(userPreferences)
        .set({
          favoriteCuisines: favoriteCuisines || [],
          dietaryRestrictions: dietaryRestrictions || [],
          cookingSkillLevel: cookingSkillLevel || null,
          householdSize: householdSize || null,
        })
        .where(eq(userPreferences.userId, userId));
    } else {
      await db.insert(userPreferences).values({
        id: crypto.randomUUID(),
        userId,
        favoriteCuisines: favoriteCuisines || [],
        dietaryRestrictions: dietaryRestrictions || [],
        cookingSkillLevel: cookingSkillLevel || null,
        householdSize: householdSize || null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
