import { NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { pilotFeedback, usageEvents, users } from "@/db/schema";
import { ensurePilotFeedbackTable, ensureUsageEventsTable } from "@/db/ensure-schema";
import { requireAdminUser } from "@/lib/admin-auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const FUNNEL_STEPS = [
  { id: "signup", label: "Signed up", eventNames: ["user_signed_up"] },
  { id: "onboarding", label: "Onboarded", eventNames: ["onboarding_completed"] },
  { id: "capture", label: "First recipe", eventNames: ["recipe_capture_completed", "ai_draft_completed", "recipe_created"] },
  { id: "plan", label: "Meal planned", eventNames: ["meal_planned"] },
  { id: "shopping", label: "Shopping list", eventNames: ["shopping_list_generated"] },
  { id: "cook", label: "Cook attempt", eventNames: ["cook_attempt_created"] },
  { id: "version", label: "Promoted version", eventNames: ["attempt_promoted_to_version"] },
];

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function parseProperties(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function countBy<T extends string>(items: T[]): Array<{ key: T; count: number }> {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function uniqueUsersForEvents(
  rows: Array<{ userId: number | null; eventName: string }>,
  eventNames: string[]
): number {
  const wanted = new Set(eventNames);
  const userIds = new Set<number>();
  for (const row of rows) {
    if (row.userId != null && wanted.has(row.eventName)) userIds.add(row.userId);
  }
  return userIds.size;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export async function GET() {
  try {
    const auth = await requireAdminUser();
    if (auth.response) return auth.response;

    await ensureUsageEventsTable();
    await ensurePilotFeedbackTable();

    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [eventRows, userRows, feedbackRows] = await Promise.all([
      db
        .select({
          id: usageEvents.id,
          userId: usageEvents.userId,
          eventName: usageEvents.eventName,
          source: usageEvents.source,
          recipeId: usageEvents.recipeId,
          mealPlanId: usageEvents.mealPlanId,
          properties: usageEvents.properties,
          path: usageEvents.path,
          createdAt: usageEvents.createdAt,
        })
        .from(usageEvents)
        .where(gte(usageEvents.createdAt, since30))
        .orderBy(desc(usageEvents.createdAt))
        .limit(5000),
      db
        .select({
          id: users.id,
          createdAt: users.createdAt,
          onboardingCompleted: users.onboardingCompleted,
          cookingGoal: users.cookingGoal,
          cookingFrequency: users.cookingFrequency,
          firstCaptureMode: users.firstCaptureMode,
        })
        .from(users),
      db
        .select({
          id: pilotFeedback.id,
          userId: pilotFeedback.userId,
          stage: pilotFeedback.stage,
          rating: pilotFeedback.rating,
          comment: pilotFeedback.comment,
          source: pilotFeedback.source,
          createdAt: pilotFeedback.createdAt,
        })
        .from(pilotFeedback)
        .orderBy(desc(pilotFeedback.createdAt))
        .limit(100),
    ]);

    const activeUserIds30 = new Set(eventRows.map((event) => event.userId).filter((id): id is number => id != null));
    const activeUserIds7 = new Set(
      eventRows
        .filter((event) => event.createdAt >= since7)
        .map((event) => event.userId)
        .filter((id): id is number => id != null)
    );
    const newUsers30 = userRows.filter((user) => user.createdAt >= since30).length;
    const onboardedUsers = userRows.filter((user) => user.onboardingCompleted).length;

    const eventCounts = countBy(eventRows.map((event) => event.eventName)).slice(0, 16);

    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(now.getTime() - (13 - index) * 24 * 60 * 60 * 1000);
      return date.toISOString().slice(0, 10);
    });
    const eventCountsByDay = new Map<string, number>();
    for (const event of eventRows) {
      const key = dayKey(event.createdAt);
      eventCountsByDay.set(key, (eventCountsByDay.get(key) ?? 0) + 1);
    }
    const eventsByDay = days.map((day) => ({ day, count: eventCountsByDay.get(day) ?? 0 }));

    const funnelBase = Math.max(userRows.length, uniqueUsersForEvents(eventRows, ["user_signed_up"]));
    const funnel = FUNNEL_STEPS.map((step) => {
      const usersForStep = step.id === "signup" ? funnelBase : uniqueUsersForEvents(eventRows, step.eventNames);
      return {
        id: step.id,
        label: step.label,
        users: usersForStep,
        rate: pct(usersForStep, funnelBase),
      };
    });

    const captureEvents = eventRows.filter((event) =>
      ["recipe_capture_completed", "ai_draft_completed", "transcription_completed", "conversation_assist_completed"].includes(event.eventName)
    );
    const captureSources = countBy(captureEvents.map((event) => event.source || "unknown")).slice(0, 8);
    const aiProviders = countBy(
      captureEvents
        .map((event) => {
          const properties = parseProperties(event.properties);
          const provider = properties.provider;
          return typeof provider === "string" && provider ? provider : "unknown";
        })
        .filter((provider) => provider !== "unknown")
    ).slice(0, 8);

    const feedbackByStage = countBy(feedbackRows.map((feedback) => feedback.stage));
    const ratedFeedback = feedbackRows.filter((feedback) => feedback.rating != null);
    const averageFeedbackRating = ratedFeedback.length
      ? Math.round((ratedFeedback.reduce((sum, item) => sum + (item.rating ?? 0), 0) / ratedFeedback.length) * 10) / 10
      : null;

    const recentFeedback = feedbackRows.slice(0, 20).map((feedback) => ({
      id: feedback.id,
      userId: feedback.userId,
      stage: feedback.stage,
      rating: feedback.rating,
      comment: feedback.comment ? feedback.comment.slice(0, 240) : null,
      source: feedback.source,
      createdAt: feedback.createdAt,
    }));

    const recentEvents = eventRows.slice(0, 30).map((event) => ({
      id: event.id,
      userId: event.userId,
      eventName: event.eventName,
      source: event.source,
      recipeId: event.recipeId,
      mealPlanId: event.mealPlanId,
      path: event.path,
      createdAt: event.createdAt,
    }));

    const onboardingGoals = countBy(
      userRows.flatMap((user) => {
        if (!user.cookingGoal) return [];
        try {
          const parsed = JSON.parse(user.cookingGoal) as unknown;
          return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
        } catch {
          return [];
        }
      })
    ).slice(0, 8);

    const onboarding = {
      completedUsers: onboardedUsers,
      completionRate: pct(onboardedUsers, userRows.length),
      goals: onboardingGoals,
      frequencies: countBy(userRows.map((user) => user.cookingFrequency || "unset")).slice(0, 8),
      firstCaptureModes: countBy(userRows.map((user) => user.firstCaptureMode || "unset")).slice(0, 8),
    };

    return NextResponse.json({
      generatedAt: now.toISOString(),
      windowDays: 30,
      summary: {
        totalUsers: userRows.length,
        newUsers30,
        activeUsers7: activeUserIds7.size,
        activeUsers30: activeUserIds30.size,
        totalEvents30: eventRows.length,
        feedbackCount: feedbackRows.length,
        averageFeedbackRating,
      },
      funnel,
      eventsByDay,
      eventCounts,
      capture: {
        total: captureEvents.length,
        sources: captureSources,
        providers: aiProviders,
      },
      onboarding,
      feedback: {
        byStage: feedbackByStage,
        recent: recentFeedback,
      },
      recentEvents,
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
