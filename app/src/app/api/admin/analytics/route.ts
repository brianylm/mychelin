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

function parseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
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
          name: users.name,
          email: users.email,
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
        .limit(500),
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

    const usageByUser = new Map<
      number,
      {
        events30: number;
        lastActivityAt: string | null;
        recipeCaptures30: number;
        aiDrafts30: number;
        transcriptions30: number;
        conversationAssists30: number;
        mealPlans30: number;
        shoppingLists30: number;
        cookAttempts30: number;
        promotedVersions30: number;
      }
    >();

    for (const event of eventRows) {
      if (event.userId == null) continue;
      const usage =
        usageByUser.get(event.userId) ??
        {
          events30: 0,
          lastActivityAt: null,
          recipeCaptures30: 0,
          aiDrafts30: 0,
          transcriptions30: 0,
          conversationAssists30: 0,
          mealPlans30: 0,
          shoppingLists30: 0,
          cookAttempts30: 0,
          promotedVersions30: 0,
        };

      usage.events30 += 1;
      if (!usage.lastActivityAt || event.createdAt > usage.lastActivityAt) usage.lastActivityAt = event.createdAt;
      if (event.eventName === "recipe_capture_completed" || event.eventName === "recipe_created") usage.recipeCaptures30 += 1;
      if (event.eventName === "ai_draft_completed") usage.aiDrafts30 += 1;
      if (event.eventName === "transcription_completed") usage.transcriptions30 += 1;
      if (event.eventName === "conversation_assist_completed") usage.conversationAssists30 += 1;
      if (event.eventName === "meal_planned") usage.mealPlans30 += 1;
      if (event.eventName === "shopping_list_generated") usage.shoppingLists30 += 1;
      if (event.eventName === "cook_attempt_created") usage.cookAttempts30 += 1;
      if (event.eventName === "attempt_promoted_to_version") usage.promotedVersions30 += 1;
      usageByUser.set(event.userId, usage);
    }

    const feedbackByUser = new Map<
      number,
      {
        count: number;
        latest: {
          stage: string;
          rating: number | null;
          comment: string | null;
          source: string | null;
          createdAt: string;
        } | null;
      }
    >();

    for (const feedback of feedbackRows) {
      if (feedback.userId == null) continue;
      const current = feedbackByUser.get(feedback.userId) ?? { count: 0, latest: null };
      current.count += 1;
      if (!current.latest || feedback.createdAt > current.latest.createdAt) {
        current.latest = {
          stage: feedback.stage,
          rating: feedback.rating,
          comment: feedback.comment ? feedback.comment.slice(0, 240) : null,
          source: feedback.source,
          createdAt: feedback.createdAt,
        };
      }
      feedbackByUser.set(feedback.userId, current);
    }

    const emptyUsage = {
      events30: 0,
      lastActivityAt: null,
      recipeCaptures30: 0,
      aiDrafts30: 0,
      transcriptions30: 0,
      conversationAssists30: 0,
      mealPlans30: 0,
      shoppingLists30: 0,
      cookAttempts30: 0,
      promotedVersions30: 0,
    };

    const userUsage = userRows
      .map((user) => {
        const usage = usageByUser.get(user.id) ?? emptyUsage;
        const feedback = feedbackByUser.get(user.id) ?? { count: 0, latest: null };
        const activationStage = usage.promotedVersions30
          ? "Promoted version"
          : usage.cookAttempts30
            ? "Cooked"
            : usage.shoppingLists30
              ? "Shopping list"
              : usage.mealPlans30
                ? "Meal planned"
                : usage.recipeCaptures30 || usage.aiDrafts30 || usage.transcriptions30 || usage.conversationAssists30
                  ? "Recipe captured"
                  : user.onboardingCompleted
                    ? "Onboarded"
                    : "Signed up";

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          onboardingCompleted: user.onboardingCompleted,
          cookingGoals: parseStringArray(user.cookingGoal),
          cookingFrequency: user.cookingFrequency,
          firstCaptureMode: user.firstCaptureMode,
          activationStage,
          feedbackCount: feedback.count,
          latestFeedback: feedback.latest,
          ...usage,
        };
      })
      .sort((a, b) => {
        const aDate = a.lastActivityAt || a.createdAt;
        const bDate = b.lastActivityAt || b.createdAt;
        return bDate.localeCompare(aDate);
      });

    const onboardingGoals = countBy(userRows.flatMap((user) => parseStringArray(user.cookingGoal))).slice(0, 8);

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
      users: userUsage,
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
