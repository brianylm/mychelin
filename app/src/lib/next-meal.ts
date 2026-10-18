import { getMealDateTime } from "@/lib/calendar";
import type { MealGroupView } from "@/lib/meal-pilot/types";

// The meal to prep next, for the "Tonight: dinner for 2 · Start prep" card
// and the home-screen shortcut. A meal stays "next" until 90 minutes after
// its serving time, since you may still be cooking or eating.
export const NEXT_MEAL_GRACE_MS = 90 * 60 * 1000;

export interface LoosePlan {
  id: number;
  date: string;
  mealType: string;
  recipeId: number;
  title: string;
  cookedAt: string | null;
  mealGroupId?: number | null;
}

export interface NextMeal {
  date: string;
  mealType: string;
  serveAt: Date;
  dinerCount: number | null;
  titles: string[];
  // Fresh dishes still to cook, ready for the grouped Cook With Me session.
  toCook: { recipeId: number; mealPlanId: number }[];
  // Ready-made food in the meal (reheat only).
  readyCount: number;
}

export function findNextMeal(
  groups: readonly MealGroupView[],
  loosePlans: readonly LoosePlan[],
  now: Date = new Date()
): NextMeal | null {
  const earliest = now.getTime() - NEXT_MEAL_GRACE_MS;
  const candidates: NextMeal[] = [];

  for (const group of groups) {
    if (group.status !== "planned") continue;
    const serveAt = new Date(group.serveAt);
    if (Number.isNaN(serveAt.getTime()) || serveAt.getTime() < earliest) continue;
    const fresh = group.dishes.filter((dish) => dish.source === "fresh");
    const toCook = fresh
      .filter((dish) => !dish.cookedAt)
      .map((dish) => ({ recipeId: dish.recipeId, mealPlanId: dish.mealPlanId }));
    const readyCount = group.dishes.length - fresh.length;
    if (toCook.length === 0 && readyCount === 0) continue;
    candidates.push({
      date: group.date,
      mealType: group.mealType,
      serveAt,
      dinerCount: group.dinerCount,
      titles: group.dishes.map((dish) => dish.title),
      toCook,
      readyCount,
    });
  }

  // Loose dishes (planned without a meal group) share a slot.
  const slots = new Map<string, LoosePlan[]>();
  for (const plan of loosePlans) {
    if (plan.mealGroupId != null || plan.cookedAt) continue;
    const key = `${plan.date}|${plan.mealType}`;
    slots.set(key, [...(slots.get(key) ?? []), plan]);
  }
  for (const plans of slots.values()) {
    const { date, mealType } = plans[0];
    const serveAt = getMealDateTime(date, mealType);
    if (serveAt.getTime() < earliest) continue;
    candidates.push({
      date,
      mealType,
      serveAt,
      dinerCount: null,
      titles: plans.map((plan) => plan.title),
      toCook: plans.map((plan) => ({ recipeId: plan.recipeId, mealPlanId: plan.id })),
      readyCount: 0,
    });
  }

  candidates.sort((a, b) => a.serveAt.getTime() - b.serveAt.getTime());
  return candidates[0] ?? null;
}

// "Tonight", "This afternoon", "Tomorrow morning", or a weekday + time.
export function describeWhen(serveAt: Date, now: Date = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((day(serveAt) - day(now)) / 86_400_000);
  const hour = serveAt.getHours();
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  if (diffDays === 0) return hour >= 17 ? "Tonight" : `This ${part}`;
  if (diffDays === 1) return `Tomorrow ${part}`;
  return serveAt.toLocaleDateString(undefined, { weekday: "long" });
}
