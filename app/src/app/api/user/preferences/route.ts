import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserOnboardingColumns } from "@/db/ensure-schema";

export const runtime = "edge";
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

    await ensureUserOnboardingColumns();

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
      onboardingCompleted: Boolean(user.onboardingCompleted),
      cookingGoal: user.cookingGoal,
      cookingFrequency: user.cookingFrequency,
      firstCaptureMode: user.firstCaptureMode,
      createdAt: user.createdAt,
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

    await ensureUserOnboardingColumns();

    const body = await request.json();
    const {
      name,
      cookingSkillLevel,
      householdSize,
      favoriteCuisines,
      dietaryRestrictions,
      onboardingCompleted,
      cookingGoal,
      cookingFrequency,
      firstCaptureMode,
    } = body;

    const updates: Partial<typeof users.$inferInsert> = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof cookingSkillLevel === "string") updates.cookingSkillLevel = cookingSkillLevel || null;
    if (typeof householdSize === "number" || householdSize === null) updates.householdSize = householdSize;
    if (Array.isArray(favoriteCuisines)) updates.favoriteCuisines = JSON.stringify(favoriteCuisines);
    if (Array.isArray(dietaryRestrictions)) updates.dietaryRestrictions = JSON.stringify(dietaryRestrictions);
    if (typeof onboardingCompleted === "boolean") updates.onboardingCompleted = onboardingCompleted;
    if (typeof cookingGoal === "string") updates.cookingGoal = cookingGoal || null;
    if (typeof cookingFrequency === "string") updates.cookingFrequency = cookingFrequency || null;
    if (typeof firstCaptureMode === "string") updates.firstCaptureMode = firstCaptureMode || null;

    if (Object.keys(updates).length > 0) {
      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, currentUser.id));
    }

    return NextResponse.json({ message: "Preferences updated successfully" });
  } catch (error) {
    console.error("PATCH /api/user/preferences error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}