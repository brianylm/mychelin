"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Clock3, Star, Utensils } from "lucide-react";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { HalfStarRating } from "@/components/recipes/HalfStarRating";

interface ActivityAttempt {
  id: number;
  recipeId: number;
  recipeTitle: string;
  recipeImageUrl: string | null;
  cookedAt: string;
  sessionEaseRating: number | null;
  dishRating: number | null;
  notes: string | null;
  nextTime: string | null;
  changeNotes: string[];
  promotedVersionId: number | null;
  mealPlanId: number | null;
  mealDate: string | null;
  mealType: string | null;
}

interface ActivityViewProps {
  onNavigateToRecipe: (recipeId: number) => void;
}

function formatDateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

function formatDay(value: string): string {
  const date = new Date(value + "T00:00:00+08:00");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function mealLabel(mealType: string | null): string {
  if (!mealType) return "Unplanned cook";
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

function RatingPill({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#f7c86a]/20 px-2 py-1 text-xs font-semibold text-[#5a3500]">
      <Star className="h-3.5 w-3.5 fill-[#f7c86a] text-[#c68a18]" />
      {label}: {value.toFixed(1).replace(".0", "")}/5
    </span>
  );
}

export function ActivityView({ onNavigateToRecipe }: ActivityViewProps) {
  const [attempts, setAttempts] = useState<ActivityAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/activity");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load activity");
      }
      const data = await response.json();
      setAttempts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const groups = useMemo(() => {
    const byDate = new Map<string, ActivityAttempt[]>();
    for (const attempt of attempts) {
      // Activity is the actual cooking log, so group by when the attempt was saved,
      // not by the meal plan's scheduled date. The meal plan still supplies meal type.
      const key = formatDateKey(attempt.cookedAt);
      byDate.set(key, [...(byDate.get(key) ?? []), attempt]);
    }
    return Array.from(byDate.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [attempts]);

  const saveDishRating = useCallback(async (attempt: ActivityAttempt, rating: number) => {
    setSavingId(attempt.id);
    setError(null);
    try {
      const response = await fetch(
        "/api/recipes/" + attempt.recipeId + "/attempts/" + attempt.id,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dishRating: rating }),
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save dish rating");
      }
      setAttempts((current) =>
        current.map((item) =>
          item.id === attempt.id ? { ...item, dishRating: rating } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save dish rating");
    } finally {
      setSavingId(null);
    }
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-ui-bg pb-20 md:pb-8">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Cooking journal"
          title="Activity"
          description="Review what you cooked by day and meal. Session difficulty is logged while cooking; dish ratings belong here after eating."
          meta={
            !loading && attempts.length > 0 ? (
              <span className="text-xs font-semibold tabular-nums text-ui-muted">
                {attempts.length} recorded dish{attempts.length === 1 ? "" : "es"}
              </span>
            ) : undefined
          }
        />

        {error && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-6 grid gap-5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="border-t border-ui-border pt-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-4 h-28 w-full" />
              </div>
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <EmptyState
            className="mt-6 border-t border-ui-border"
            title="No cooking activity yet"
            description="Finish a cook-with-me session or log a cook. The attempt will appear here by day and meal."
          />
        ) : (
          <div className="mt-7 space-y-8">
            {groups.map(([date, dayAttempts]) => {
              const byMeal = new Map<string, ActivityAttempt[]>();
              for (const attempt of dayAttempts) {
                const key = mealLabel(attempt.mealType);
                byMeal.set(key, [...(byMeal.get(key) ?? []), attempt]);
              }

              return (
                <section key={date} className="border-t border-ui-border pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-lg font-semibold text-ui-text">
                      {formatDay(date)}
                    </h2>
                    <span className="text-xs font-medium tabular-nums text-ui-muted">
                      {dayAttempts.length} dish{dayAttempts.length === 1 ? "" : "es"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-6">
                    {Array.from(byMeal.entries()).map(([meal, mealAttempts]) => (
                      <section key={meal}>
                        <h3 className="flex min-h-11 items-center gap-2 border-b border-ui-border text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
                          <Utensils className="h-4 w-4 text-ui-accent" aria-hidden="true" />
                          {meal}
                        </h3>
                        <div className="divide-y divide-ui-border">
                          {mealAttempts.map((attempt) => (
                            <article key={attempt.id} className="py-4">
                              <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                                <button
                                  type="button"
                                  onClick={() => onNavigateToRecipe(attempt.recipeId)}
                                  className="flex aspect-square h-[4.5rem] items-center justify-center overflow-hidden rounded-lg bg-ui-surface-subtle text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
                                  aria-label={"Open " + attempt.recipeTitle}
                                >
                                  {attempt.recipeImageUrl ? (
                                    <img
                                      src={attempt.recipeImageUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <ChefHat className="h-6 w-6" aria-hidden="true" />
                                  )}
                                </button>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => onNavigateToRecipe(attempt.recipeId)}
                                    className="block min-h-11 max-w-full text-left text-base font-semibold text-ui-text transition-colors duration-200 hover:text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
                                  >
                                    {attempt.recipeTitle}
                                  </button>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-ui-muted">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                      {formatTime(attempt.cookedAt)}
                                    </span>
                                    <RatingPill value={attempt.sessionEaseRating} label="Difficulty" />
                                    <RatingPill value={attempt.dishRating} label="Dish" />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 border-t border-ui-border pt-3">
                                <p className="mb-2 text-xs font-semibold text-ui-muted">
                                  How did the dish turn out?
                                </p>
                                <HalfStarRating
                                  value={attempt.dishRating}
                                  disabled={savingId === attempt.id}
                                  onChange={(rating) => saveDishRating(attempt, rating)}
                                  ariaLabel="Dish rating"
                                  size="sm"
                                  leftLabel="Needs work"
                                  rightLabel="Cook again"
                                />
                              </div>

                              {(attempt.nextTime || attempt.changeNotes.length > 0) && (
                                <div className="mt-3 border-l-2 border-ui-accent pl-3 text-sm leading-6 text-ui-muted">
                                  {attempt.nextTime && <p>Next cook: {attempt.nextTime}</p>}
                                  {attempt.changeNotes.slice(0, 2).map((note, index) => (
                                    <p key={index}>{note}</p>
                                  ))}
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
