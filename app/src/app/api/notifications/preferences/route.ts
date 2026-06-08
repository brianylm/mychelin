import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { ensureNotificationTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { clampWeeklyGoal } from "@/lib/rhythm";
import { eq } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type PreferenceRow = typeof notificationPreferences.$inferSelect;

function serialize(row: PreferenceRow) {
  return {
    weeklyCookingGoal: row.weeklyCookingGoal,
    rhythmReminders: Boolean(row.rhythmReminders),
    mealReminders: Boolean(row.mealReminders),
    prepReminders: Boolean(row.prepReminders),
    reviewReminders: Boolean(row.reviewReminders),
    familyActivity: Boolean(row.familyActivity),
    reminderTime: row.reminderTime,
    timezone: row.timezone,
    updatedAt: row.updatedAt,
  };
}

async function getOrCreatePreferences(userId: number): Promise<PreferenceRow> {
  await ensureNotificationTables();
  const existing = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });
  if (existing) return existing;

  const now = new Date().toISOString();
  const [created] = await db
    .insert(notificationPreferences)
    .values({ userId, updatedAt: now })
    .returning();
  return created;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const prefs = await getOrCreatePreferences(currentUser.id);
    return NextResponse.json(serialize(prefs));
  } catch (error) {
    console.error("GET /api/notifications/preferences error:", error);
    return NextResponse.json({ error: "Failed to fetch notification preferences" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureNotificationTables();
    await getOrCreatePreferences(currentUser.id);

    const body = await request.json();
    const updates: Partial<typeof notificationPreferences.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.weeklyCookingGoal !== undefined) updates.weeklyCookingGoal = clampWeeklyGoal(body.weeklyCookingGoal);
    if (typeof body.rhythmReminders === "boolean") updates.rhythmReminders = body.rhythmReminders;
    if (typeof body.mealReminders === "boolean") updates.mealReminders = body.mealReminders;
    if (typeof body.prepReminders === "boolean") updates.prepReminders = body.prepReminders;
    if (typeof body.reviewReminders === "boolean") updates.reviewReminders = body.reviewReminders;
    if (typeof body.familyActivity === "boolean") updates.familyActivity = body.familyActivity;
    if (typeof body.reminderTime === "string" && /^\d{2}:\d{2}$/.test(body.reminderTime)) {
      updates.reminderTime = body.reminderTime;
    }
    if (typeof body.timezone === "string" && body.timezone.length <= 80) {
      updates.timezone = body.timezone;
    }

    const [saved] = await db
      .update(notificationPreferences)
      .set(updates)
      .where(eq(notificationPreferences.userId, currentUser.id))
      .returning();

    return NextResponse.json(serialize(saved));
  } catch (error) {
    console.error("PATCH /api/notifications/preferences error:", error);
    return NextResponse.json({ error: "Failed to update notification preferences" }, { status: 500 });
  }
}
