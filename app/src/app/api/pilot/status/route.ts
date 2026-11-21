import { NextResponse } from "next/server";
import { and, desc, eq, inArray, min } from "drizzle-orm";
import { db } from "@/db";
import { pilotFeedback, recipes, usageEvents } from "@/db/schema";
import { ensurePilotFeedbackTable, ensureUsageEventsTable } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import {
  GOAL_EVENT_NAMES,
  SHOPPING_EVENT_NAMES,
  isGoalEvent,
  isShoppingEvent,
  type ChecklistEvent,
} from "@/lib/pilot-checklist";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type Check =
  | { id: string; label: string; kind: "activeRecipe" }
  | { id: string; label: string; kind: "events"; eventNames: string[]; matches?: (event: ChecklistEvent) => boolean };

const CHECKS: Check[] = [
  { id: "onboarding", label: "Set cooking goals", kind: "events", eventNames: GOAL_EVENT_NAMES, matches: isGoalEvent },
  { id: "capture", label: "Capture or create first recipe", kind: "activeRecipe" },
  { id: "plan", label: "Plan one meal", kind: "events", eventNames: ["meal_planned"] },
  { id: "shopping", label: "Generate shopping list", kind: "events", eventNames: SHOPPING_EVENT_NAMES, matches: isShoppingEvent },
  { id: "cook", label: "Finish cook-with-me and save an attempt", kind: "events", eventNames: ["cook_attempt_created"] },
  { id: "version", label: "Promote an attempt to a version", kind: "events", eventNames: ["attempt_promoted_to_version"] },
];

const CHECK_EVENT_NAMES = Array.from(
  new Set(CHECKS.flatMap((check) => (check.kind === "events" ? check.eventNames : [])))
);

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureUsageEventsTable();
    await ensurePilotFeedbackTable();

    const [events, activeRecipeRows, feedback] = await Promise.all([
      // Only the events the checklist reads, so busy event types cannot
      // push an old tick out of a row limit.
      db
        .select({ eventName: usageEvents.eventName, properties: usageEvents.properties, createdAt: usageEvents.createdAt })
        .from(usageEvents)
        .where(and(eq(usageEvents.userId, currentUser.id), inArray(usageEvents.eventName, CHECK_EVENT_NAMES))),
      db
        .select({ firstActiveAt: min(recipes.createdAt) })
        .from(recipes)
        .where(and(eq(recipes.userId, currentUser.id), eq(recipes.status, "active"))),
      db
        .select({ stage: pilotFeedback.stage, rating: pilotFeedback.rating, createdAt: pilotFeedback.createdAt })
        .from(pilotFeedback)
        .where(eq(pilotFeedback.userId, currentUser.id))
        .orderBy(desc(pilotFeedback.createdAt))
        .limit(50),
    ]);

    const firstActiveAt = activeRecipeRows[0]?.firstActiveAt ?? null;

    const checklist = CHECKS.map((check) => {
      let completedAt: string | null;
      if (check.kind === "activeRecipe") {
        completedAt = firstActiveAt;
      } else {
        completedAt = events
          .filter((event) => check.eventNames.includes(event.eventName))
          .filter((event) => (check.matches ? check.matches(event) : true))
          .map((event) => event.createdAt)
          .sort()
          .at(0) ?? null;
      }
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
