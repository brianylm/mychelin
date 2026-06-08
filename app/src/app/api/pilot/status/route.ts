import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pilotFeedback, usageEvents } from "@/db/schema";
import { ensurePilotFeedbackTable, ensureUsageEventsTable } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const CHECKS = [
  { id: "onboarding", label: "Set cooking goals", eventNames: ["onboarding_completed"] },
  { id: "capture", label: "Capture or create first recipe", eventNames: ["recipe_capture_completed", "ai_draft_completed", "recipe_created"] },
  { id: "plan", label: "Plan one meal", eventNames: ["meal_planned"] },
  { id: "shopping", label: "Generate shopping list", eventNames: ["shopping_list_generated"] },
  { id: "cook", label: "Finish cook-with-me and save an attempt", eventNames: ["cook_attempt_created"] },
  { id: "version", label: "Promote an attempt to a version", eventNames: ["attempt_promoted_to_version"] },
];

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureUsageEventsTable();
    await ensurePilotFeedbackTable();

    const [events, feedback] = await Promise.all([
      db
        .select({ eventName: usageEvents.eventName, createdAt: usageEvents.createdAt })
        .from(usageEvents)
        .where(eq(usageEvents.userId, currentUser.id))
        .orderBy(desc(usageEvents.createdAt))
        .limit(200),
      db
        .select({ stage: pilotFeedback.stage, rating: pilotFeedback.rating, createdAt: pilotFeedback.createdAt })
        .from(pilotFeedback)
        .where(eq(pilotFeedback.userId, currentUser.id))
        .orderBy(desc(pilotFeedback.createdAt))
        .limit(50),
    ]);

    const firstEventByName = new Map<string, string>();
    for (const event of events) {
      if (!firstEventByName.has(event.eventName)) firstEventByName.set(event.eventName, event.createdAt);
    }

    const checklist = CHECKS.map((check) => {
      const completedAt = check.eventNames
        .map((name) => firstEventByName.get(name))
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(0) ?? null;
      return { id: check.id, label: check.label, completed: Boolean(completedAt), completedAt };
    });

    return NextResponse.json({
      checklist,
      completedCount: checklist.filter((item) => item.completed).length,
      totalCount: checklist.length,
      feedbackCount: feedback.length,
      latestFeedbackAt: feedback[0]?.createdAt ?? null,
    });
  } catch (error) {
    console.error("GET /api/pilot/status error:", error);
    return NextResponse.json({ error: "Failed to fetch pilot status" }, { status: 500 });
  }
}
