"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Clock3, Star, Utensils } from "lucide-react";
import { EmptyState, Panel } from "@/components/ui";
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
      const key = attempt.mealDate ?? formatDateKey(attempt.cookedAt);
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
    <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
      <div className="mx-auto max-w-4xl px-5 py-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#800020]">
            Activity
          </p>
          <h1 className="app-editorial-title mt-2 text-4xl leading-none text-[#1A1A1A]">
            Cooking log
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Cook-with-me saves the cooking session first. After the meal, rate how the dish turned out and keep next-time notes close by.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="h-32 animate-pulse rounded-2xl bg-white/75" />
            <div className="h-32 animate-pulse rounded-2xl bg-white/75" />
          </div>
        ) : attempts.length === 0 ? (
          <EmptyState
            title="No cooking activity yet"
            description="Finish a cook-with-me session and it will appear here by day and meal."
          />
        ) : (
          <div className="space-y-5">
            {groups.map(([date, dayAttempts]) => {
              const byMeal = new Map<string, ActivityAttempt[]>();
              for (const attempt of dayAttempts) {
                const key = mealLabel(attempt.mealType);
                byMeal.set(key, [...(byMeal.get(key) ?? []), attempt]);
              }

              return (
                <section key={date} className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {formatDay(date)}
                    </h2>
                    <span className="text-xs font-medium text-neutral-400">
                      {dayAttempts.length} dish{dayAttempts.length === 1 ? "" : "es"}
                    </span>
                  </div>

                  {Array.from(byMeal.entries()).map(([meal, mealAttempts]) => (
                    <Panel key={meal} raised className="p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ui-muted)]">
                        <Utensils className="h-4 w-4 text-[#800020]" />
                        {meal}
                      </div>
                      <div className="space-y-3">
                        {mealAttempts.map((attempt) => (
                          <article
                            key={attempt.id}
                            className="rounded-xl border border-[#eadfce] bg-[#fffdfb] p-3"
                          >
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => onNavigateToRecipe(attempt.recipeId)}
                                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#800020]/7 text-[#800020]"
                                aria-label={"Open " + attempt.recipeTitle}
                              >
                                {attempt.recipeImageUrl ? (
                                  <img
                                    src={attempt.recipeImageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ChefHat className="h-6 w-6" />
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => onNavigateToRecipe(attempt.recipeId)}
                                  className="block truncate text-left text-base font-semibold text-neutral-900 hover:text-[#800020]"
                                >
                                  {attempt.recipeTitle}
                                </button>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {formatTime(attempt.cookedAt)}
                                  </span>
                                  <RatingPill value={attempt.sessionEaseRating} label="Ease" />
                                  <RatingPill value={attempt.dishRating} label="Dish" />
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 rounded-xl border border-[#f0e5d8] bg-white px-3 py-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
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
                              <div className="mt-3 space-y-1 text-sm leading-6 text-neutral-600">
                                {attempt.nextTime && <p>Next cook: {attempt.nextTime}</p>}
                                {attempt.changeNotes.slice(0, 2).map((note, index) => (
                                  <p key={index}>{note}</p>
                                ))}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </Panel>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
