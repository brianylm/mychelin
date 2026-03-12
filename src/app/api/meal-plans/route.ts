import { NextRequest, NextResponse } from "next/server";
import { db, mealPlans, users } from "@/db";
import { eq, and } from "drizzle-orm";

// Ensure demo user exists
async function ensureDemoUser() {
  const existing = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, "demo-user"),
  });
  if (!existing) {
    await db.insert(users).values({
      id: "demo-user",
      name: "Family Chef",
      email: "chef@mychelin.app",
    });
  }
}

// GET /api/meal-plans - Get meal plans for demo user
export async function GET() {
  try {
    const plans = await db.query.mealPlans.findMany({
      where: (mealPlans, { eq }) => eq(mealPlans.userId, "demo-user"),
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    return NextResponse.json({ error: "Failed to fetch meal plans" }, { status: 500 });
  }
}

// POST /api/meal-plans - Save/update meal plans
export async function POST(request: NextRequest) {
  try {
    const { plans } = await request.json();
    const userId = "demo-user";

    await ensureDemoUser();

    // Clear existing plans for demo user
    await db.delete(mealPlans).where(eq(mealPlans.userId, userId));

    // Insert new plans
    if (plans.length > 0) {
      const mealPlanData = plans.map((plan: any) => ({
        id: crypto.randomUUID(),
        userId,
        date: new Date(plan.date + "T00:00:00Z"),
        mealType: plan.meal as "breakfast" | "lunch" | "dinner" | "snack",
        notes: plan.title,
        recipeId: plan.recipeId || null,
        completed: false,
      }));

      await db.insert(mealPlans).values(mealPlanData);
    }

    return NextResponse.json({ success: true, saved: plans.length });
  } catch (error) {
    console.error("Error saving meal plans:", error);
    return NextResponse.json({ error: "Failed to save meal plans" }, { status: 500 });
  }
}