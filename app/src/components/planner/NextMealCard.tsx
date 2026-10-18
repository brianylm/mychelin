"use client";

import { useQuery } from "@tanstack/react-query";
import { ChefHat } from "lucide-react";
import { describeWhen, findNextMeal, type LoosePlan, type NextMeal } from "@/lib/next-meal";
import { listMealGroups } from "@/lib/meal-pilot/client";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function loadNextMeal(now = new Date()): Promise<NextMeal | null> {
  const today = localDateKey(now);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);

  const [groupsResult, plansResult] = await Promise.allSettled([
    listMealGroups(today, tomorrow),
    fetch(`/api/meal-plans?startDate=${today}&endDate=${tomorrow}`).then(async (response) => {
      if (!response.ok) throw new Error("Failed to load meal plans");
      return (await response.json()) as { plans?: Array<{
        id: number;
        date: string;
        mealType: string;
        recipeId: number;
        cookedAt: string | null;
        mealGroupId: number | null;
        recipe?: { title: string };
        ghostTitle?: string | null;
      }> };
    }),
  ]);

  const groups = groupsResult.status === "fulfilled" ? groupsResult.value.mealGroups : [];
  const loose: LoosePlan[] = plansResult.status === "fulfilled"
    ? (plansResult.value.plans ?? []).map((plan) => ({
        id: plan.id,
        date: plan.date,
        mealType: plan.mealType,
        recipeId: plan.recipeId,
        cookedAt: plan.cookedAt,
        mealGroupId: plan.mealGroupId,
        title: plan.recipe?.title ?? plan.ghostTitle ?? "Planned dish",
      }))
    : [];

  return findNextMeal(groups, loose, now);
}

export function NextMealCard({
  onStartPrep,
}: {
  onStartPrep: (dishes: { recipeId: number; mealPlanId: number }[]) => void;
}) {
  const { data: meal, isLoading, isError } = useQuery({
    queryKey: ["meal-pilot", "next-meal"],
    queryFn: () => loadNextMeal(),
    staleTime: 60_000,
  });

  if (isLoading || isError || !meal) return null;

  const mealType = meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1);
  const titles = meal.titles.slice(0, 3).join(" · ") + (meal.titles.length > 3 ? ` +${meal.titles.length - 3} more` : "");

  return (
    <section aria-label="Next meal" className="mx-4 mt-4 w-auto rounded-xl border border-ui-border bg-ui-surface-raised p-4 md:mx-auto md:w-full md:max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-ui-accent">
        {describeWhen(meal.serveAt)} · {mealType}{meal.dinerCount ? ` for ${meal.dinerCount}` : ""}
      </p>
      <p className="mt-1 text-base font-semibold text-ui-text">{titles}</p>
      {meal.readyCount > 0 && meal.toCook.length > 0 && (
        <p className="mt-1 text-sm text-ui-muted">{meal.readyCount} ready to reheat</p>
      )}
      {meal.toCook.length > 0 ? (
        <button
          type="button"
          onClick={() => onStartPrep(meal.toCook)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-ui-action px-4 text-sm font-semibold text-ui-action-text hover:bg-ui-action-hover"
        >
          <ChefHat className="h-4 w-4" aria-hidden="true" />
          Start prep
        </button>
      ) : (
        <p className="mt-3 text-sm text-ui-muted">Ready food only — just reheat.</p>
      )}
    </section>
  );
}
