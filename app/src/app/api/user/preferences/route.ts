import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificationPreferences, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { ensureNotificationTables, ensureUserOAuthColumns, ensureUserOnboardingColumns } from "@/db/ensure-schema";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";
import { weeklyGoalFromOnboarding } from "@/lib/rhythm";

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
    await ensureUserOAuthColumns();

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
    await ensureUserOAuthColumns();

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

    if (onboardingCompleted === true) {
      await ensureNotificationTables();
      const weeklyCookingGoal = weeklyGoalFromOnboarding({ cookingFrequency, cookingGoal });
      const now = new Date().toISOString();
      const existingNotificationPrefs = await db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.userId, currentUser.id),
      });
      if (existingNotificationPrefs) {
        await db
          .update(notificationPreferences)
          .set({ weeklyCookingGoal, updatedAt: now })
          .where(eq(notificationPreferences.userId, currentUser.id));
      } else {
        await db.insert(notificationPreferences).values({
          userId: currentUser.id,
          weeklyCookingGoal,
          updatedAt: now,
        });
      }

      await trackUsageEvent({
        userId: currentUser.id,
        eventName: "onboarding_completed",
        source: "onboarding",
        properties: {
          has_goal: Boolean(cookingGoal),
          has_frequency: Boolean(cookingFrequency),
          weekly_cooking_goal: weeklyGoalFromOnboarding({ cookingFrequency, cookingGoal }),
          first_capture_mode: typeof firstCaptureMode === "string" ? firstCaptureMode : null,
        },
        path: requestPath(request),
      });
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