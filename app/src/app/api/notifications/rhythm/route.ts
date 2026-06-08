import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { mealPlans, notificationPreferences, recipeAttempts } from "@/db/schema";
import { ensureNotificationTables, ensureRecipeAttemptsTable } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { getSingaporeWeekWindow } from "@/lib/rhythm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureNotificationTables();
    await ensureRecipeAttemptsTable();

    const window = getSingaporeWeekWindow();
    let prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, currentUser.id),
    });
    if (!prefs) {
      const [created] = await db
        .insert(notificationPreferences)
        .values({ userId: currentUser.id, updatedAt: new Date().toISOString() })
        .returning();
      prefs = created;
    }

    const [attempts, plans] = await Promise.all([
      db
        .select({ id: recipeAttempts.id })
        .from(recipeAttempts)
        .where(
          and(
            eq(recipeAttempts.userId, currentUser.id),
            gte(recipeAttempts.cookedAt, window.startIso),
            lte(recipeAttempts.cookedAt, window.endIso)
          )
        ),
      db
        .select({ id: mealPlans.id, cookedAt: mealPlans.cookedAt })
        .from(mealPlans)
        .where(
          and(
            eq(mealPlans.userId, currentUser.id),
            gte(mealPlans.date, window.startDate),
            lte(mealPlans.date, window.endDate)
          )
        ),
    ]);

    const cookedThisWeek = attempts.length;
    const plannedThisWeek = plans.length;
    const cookedFromPlan = plans.filter((plan) => Boolean(plan.cookedAt)).length;
    const goal = prefs.weeklyCookingGoal;
    const progress = Math.min(100, Math.round((cookedThisWeek / Math.max(goal, 1)) * 100));

    return NextResponse.json({
      weekStart: window.startDate,
      weekEnd: window.endDate,
      weeklyCookingGoal: goal,
      cookedThisWeek,
      plannedThisWeek,
      cookedFromPlan,
      remainingToGoal: Math.max(0, goal - cookedThisWeek),
      progress,
      status: cookedThisWeek >= goal ? "on_track" : plannedThisWeek >= goal ? "planned" : "needs_plan",
    });
  } catch (error) {
    console.error("GET /api/notifications/rhythm error:", error);
    return NextResponse.json({ error: "Failed to fetch cooking rhythm" }, { status: 500 });
  }
}
