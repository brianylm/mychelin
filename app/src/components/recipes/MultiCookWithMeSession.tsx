"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChefHat, Clock3, Minus, Plus, TimerReset, X } from "lucide-react";
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import type { RecipeWithRelations } from "@/store/RecipeStore";
import { playTimerAlarm, primeTimerAlarm } from "@/lib/timer-alarm";
import { detectStepTimerSeconds } from "@/lib/step-timers";

interface BatchCookMeal {
  recipe: RecipeWithRelations;
  mealPlanId?: number;
}

interface MultiCookWithMeSessionProps {
  meals: BatchCookMeal[];
  onClose: () => void;
  onComplete?: (mealPlanIds: number[]) => void | Promise<void>;
}

type TimerState = {
  duration: number;
  remaining: number;
  running: boolean;
};


function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + seconds.toString().padStart(2, "0");
}

function timerKey(recipeId: number, stepIndex: number): string {
  return recipeId + ":" + stepIndex;
}

function toAttemptIngredients(recipe: RecipeWithRelations) {
  return (recipe.ingredients ?? []).map((ingredient) => ({
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    approximate: ingredient.approximate,
    quantityText: ingredient.quantityText,
    notes: ingredient.notes,
  }));
}

function toAttemptInstructions(recipe: RecipeWithRelations) {
  return (recipe.instructions ?? []).map((instruction) => ({
    stepNumber: instruction.stepNumber,
    content: instruction.content,
    tip: instruction.tip,
    imageUrl: instruction.imageUrl,
  }));
}

function HalfStarRating({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Dish rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = value >= star ? "full" : value >= star - 0.5 ? "half" : "empty";
        return (
          <div key={star} className="relative h-8 w-8">
            <StarIcon className="absolute inset-0 h-8 w-8 text-white/30" />
            {fill !== "empty" && (
              <div className={fill === "half" ? "absolute inset-0 w-4 overflow-hidden" : "absolute inset-0"} aria-hidden="true">
                <StarFilledIcon className="h-8 w-8 text-[#f7c86a]" />
              </div>
            )}
            <button
              type="button"
              onClick={() => onChange(star - 0.5)}
              className="absolute inset-y-0 left-0 w-1/2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#f7c86a]/50"
              role="radio"
              aria-checked={value === star - 0.5}
              aria-label={"Rate " + (star - 0.5).toFixed(1).replace(".0", "") + " out of 5"}
            />
            <button
              type="button"
              onClick={() => onChange(star)}
              className="absolute inset-y-0 right-0 w-1/2 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#f7c86a]/50"
              role="radio"
              aria-checked={value === star}
              aria-label={"Rate " + star + " out of 5"}
            />
          </div>
        );
      })}
      <span className="ml-1 text-xs text-white/60">{value > 0 ? value.toFixed(1).replace(".0", "") + "/5" : "Not rated"}</span>
    </div>
  );
}

export function MultiCookWithMeSession({ meals, onClose, onComplete }: MultiCookWithMeSessionProps) {
  const [stepIndexes, setStepIndexes] = useState<Record<number, number>>({});
  const [completedRecipes, setCompletedRecipes] = useState<Record<number, boolean>>({});
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const previousTimersRef = useRef<Record<string, TimerState>>({});
  const [reviewing, setReviewing] = useState(false);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [nextTimeNotes, setNextTimeNotes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeCount = meals.filter((meal) => completedRecipes[meal.recipe.id]).length;
  const allComplete = meals.length > 0 && completeCount === meals.length;

  useEffect(() => {
    const activeEntries = Object.entries(timers).filter(([, timer]) => timer.running && timer.remaining > 0);
    if (activeEntries.length === 0) return;

    const interval = window.setInterval(() => {
      setTimers((current) => {
        const next = { ...current };
        for (const [key, timer] of Object.entries(current)) {
          if (!timer.running) continue;
          const remaining = Math.max(0, timer.remaining - 1);
          next[key] = { ...timer, remaining, running: remaining > 0 };
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timers]);


  useEffect(() => {
    const previous = previousTimersRef.current;
    const completed = Object.entries(timers).some(([key, timer]) => {
      const before = previous[key];
      return Boolean(before?.running && before.remaining > 0 && timer.remaining === 0 && !timer.running);
    });
    previousTimersRef.current = timers;
    if (completed) playTimerAlarm();
  }, [timers]);

  const getStepIndex = useCallback((recipeId: number) => stepIndexes[recipeId] ?? 0, [stepIndexes]);

  const ensureTimer = useCallback((recipe: RecipeWithRelations) => {
    const stepIndex = getStepIndex(recipe.id);
    const instruction = recipe.instructions?.[stepIndex];
    if (!instruction) return;
    primeTimerAlarm();
    const key = timerKey(recipe.id, stepIndex);
    setTimers((current) => {
      if (current[key]) return current;
      const duration = detectStepTimerSeconds(instruction.content);
      return { ...current, [key]: { duration, remaining: duration, running: false } };
    });
  }, [getStepIndex]);

  const toggleTimer = useCallback((recipe: RecipeWithRelations) => {
    const stepIndex = getStepIndex(recipe.id);
    const instruction = recipe.instructions?.[stepIndex];
    if (!instruction) return;
    primeTimerAlarm();
    const key = timerKey(recipe.id, stepIndex);
    setTimers((current) => {
      const existing = current[key];
      const duration = existing?.duration ?? detectStepTimerSeconds(instruction.content);
      return {
        ...current,
        [key]: {
          duration,
          remaining: existing?.remaining ?? duration,
          running: !(existing?.running ?? false),
        },
      };
    });
  }, [getStepIndex]);

  const adjustTimer = useCallback((recipe: RecipeWithRelations, deltaSeconds: number) => {
    const stepIndex = getStepIndex(recipe.id);
    const instruction = recipe.instructions?.[stepIndex];
    if (!instruction) return;
    const key = timerKey(recipe.id, stepIndex);
    setTimers((current) => {
      const existing = current[key];
      const duration = existing?.duration ?? detectStepTimerSeconds(instruction.content);
      return {
        ...current,
        [key]: {
          duration: Math.max(60, duration + deltaSeconds),
          remaining: Math.max(0, (existing?.remaining ?? duration) + deltaSeconds),
          running: existing?.running ?? false,
        },
      };
    });
  }, [getStepIndex]);

  const resetTimer = useCallback((recipe: RecipeWithRelations) => {
    const stepIndex = getStepIndex(recipe.id);
    const instruction = recipe.instructions?.[stepIndex];
    if (!instruction) return;
    const key = timerKey(recipe.id, stepIndex);
    const duration = timers[key]?.duration ?? detectStepTimerSeconds(instruction.content);
    setTimers((current) => ({ ...current, [key]: { duration, remaining: duration, running: false } }));
  }, [getStepIndex, timers]);

  const moveStep = useCallback((recipe: RecipeWithRelations, direction: 1 | -1) => {
    const instructions = recipe.instructions ?? [];
    const current = getStepIndex(recipe.id);
    if (direction === 1 && current >= instructions.length - 1) {
      setCompletedRecipes((state) => ({ ...state, [recipe.id]: true }));
      return;
    }
    setCompletedRecipes((state) => ({ ...state, [recipe.id]: false }));
    setStepIndexes((state) => ({
      ...state,
      [recipe.id]: Math.max(0, Math.min(instructions.length - 1, current + direction)),
    }));
  }, [getStepIndex]);


  const requestClose = useCallback(() => {
    setConfirmingExit(true);
  }, []);

  const confirmExit = useCallback(() => {
    setConfirmingExit(false);
    onClose();
  }, [onClose]);

  const saveAttempts = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      for (const meal of meals) {
        const response = await fetch("/api/recipes/" + meal.recipe.id + "/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionId: meal.recipe.activeVersionId ?? null,
            mealPlanId: meal.mealPlanId ?? null,
            rating: ratings[meal.recipe.id] || null,
            notes: "Batch cook-with-me session",
            changeNotes: [],
            nextTime: nextTimeNotes[meal.recipe.id]?.trim() || null,
            ingredientsSnapshot: toAttemptIngredients(meal.recipe),
            instructionsSnapshot: toAttemptInstructions(meal.recipe),
            cookedAt: new Date().toISOString(),
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to save batch cooking attempt");
        }
      }

      await onComplete?.(meals.map((meal) => meal.mealPlanId).filter((id): id is number => id != null));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save batch cooking attempts");
    } finally {
      setSaving(false);
    }
  }, [meals, nextTimeNotes, onClose, onComplete, ratings]);

  const activeTimerRows = useMemo(() => {
    return Object.entries(timers)
      .filter(([, timer]) => timer.running)
      .map(([key, timer]) => {
        const [recipeIdText, stepIndexText] = key.split(":");
        const recipeId = Number(recipeIdText);
        const stepIndex = Number(stepIndexText);
        const meal = meals.find((item) => item.recipe.id === recipeId);
        return {
          key,
          recipeTitle: meal?.recipe.title ?? "Dish",
          stepLabel: Number.isFinite(stepIndex) ? "Step " + (stepIndex + 1) : "Timer",
          remaining: timer.remaining,
        };
      });
  }, [meals, timers]);

  const activeTimers = activeTimerRows.length;

  return (
    <div className="fixed inset-0 z-50 bg-[#17131f] text-white">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#17131f]/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={requestClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Close batch cook with me"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 px-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Cook with me</p>
            <h2 className="truncate text-sm font-semibold text-white">{meals.length} dishes together</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#800020] text-white">
            <ChefHat className="h-5 w-5" />
          </div>
        </header>

        {reviewing ? (
          <main className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto max-w-3xl space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f7c86a]">Session complete</p>
                <h3 className="mt-2 text-3xl font-semibold">Rate each dish</h3>
              </div>
              {meals.map((meal) => (
                <section key={meal.recipe.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <h4 className="text-base font-semibold">{meal.recipe.title}</h4>
                  <div className="mt-3">
                    <HalfStarRating
                      value={ratings[meal.recipe.id] ?? 0}
                      onChange={(value) => setRatings((state) => ({ ...state, [meal.recipe.id]: value }))}
                    />
                  </div>
                  <textarea
                    value={nextTimeNotes[meal.recipe.id] ?? ""}
                    onChange={(event) => setNextTimeNotes((state) => ({ ...state, [meal.recipe.id]: event.target.value }))}
                    rows={2}
                    placeholder="What should change next time?"
                    className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#f7c86a]/70 focus:ring-2 focus:ring-[#f7c86a]/15"
                  />
                </section>
              ))}
              {error && <p className="rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-white/60">
              <span>{completeCount} of {meals.length} dishes finished</span>
              <span>{activeTimers} timer{activeTimers === 1 ? "" : "s"} running</span>
            </div>
            {activeTimerRows.length > 0 && (
              <div className="sticky top-0 z-10 mb-4 rounded-2xl border border-[#f7c86a]/25 bg-[#17131f]/95 p-3 shadow-xl backdrop-blur">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f7c86a]">
                  Live timers
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {activeTimerRows.map((timer) => (
                    <div
                      key={timer.key}
                      className="min-w-44 rounded-xl border border-white/10 bg-white/10 px-3 py-2"
                    >
                      <p className="truncate text-xs font-semibold text-white">{timer.recipeTitle}</p>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-[10px] text-white/55">{timer.stepLabel}</span>
                        <span className="font-mono text-lg font-bold text-[#f7c86a]">
                          {formatTime(timer.remaining)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {meals.map((meal) => {
                const recipe = meal.recipe;
                const instructions = recipe.instructions ?? [];
                const stepIndex = getStepIndex(recipe.id);
                const currentInstruction = instructions[stepIndex];
                const isDone = Boolean(completedRecipes[recipe.id]);
                const key = timerKey(recipe.id, stepIndex);
                const currentTimer = timers[key];
                const defaultTimer = detectStepTimerSeconds(currentInstruction?.content ?? "");

                return (
                  <section key={recipe.id} className="rounded-2xl border border-white/10 bg-[#fffdfb] p-4 text-[#17131f] shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#800020]">Dish</p>
                        <h3 className="truncate text-lg font-semibold">{recipe.title}</h3>
                      </div>
                      {isDone && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Done</span>}
                    </div>

                    {instructions.length === 0 ? (
                      <p className="mt-5 rounded-xl bg-[#800020]/5 px-3 py-3 text-sm text-[#521224]">This recipe needs steps before it can be cooked here.</p>
                    ) : (
                      <>
                        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                          <span>Step {stepIndex + 1} of {instructions.length}</span>
                          <span>{Math.round(((stepIndex + 1) / instructions.length) * 100)}%</span>
                        </div>
                        <p className="mt-3 min-h-[5rem] text-2xl font-semibold leading-snug">{currentInstruction?.content}</p>
                        {currentInstruction?.tip && <p className="mt-3 rounded-xl bg-[#800020]/5 px-3 py-2 text-sm text-[#521224]">{currentInstruction.tip}</p>}

                        <div className="mt-4 rounded-xl border border-[#800020]/10 bg-[#800020]/5 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Clock3 className="h-5 w-5 text-[#800020]" />
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#800020]">Timer</p>
                                <p className="font-mono text-2xl font-semibold">{formatTime(currentTimer?.remaining ?? defaultTimer)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => { ensureTimer(recipe); toggleTimer(recipe); }}
                              className="rounded-full bg-[#17131f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#800020]"
                            >
                              {currentTimer?.running ? "Pause" : "Start"}
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => adjustTimer(recipe, -60)} className="flex items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-xs font-medium text-neutral-700 shadow-sm"><Minus className="h-3.5 w-3.5" />1 min</button>
                            <button type="button" onClick={() => resetTimer(recipe)} className="flex items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-xs font-medium text-neutral-700 shadow-sm"><TimerReset className="h-3.5 w-3.5" />Reset</button>
                            <button type="button" onClick={() => adjustTimer(recipe, 60)} className="flex items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-xs font-medium text-neutral-700 shadow-sm"><Plus className="h-3.5 w-3.5" />1 min</button>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button type="button" onClick={() => moveStep(recipe, -1)} disabled={stepIndex === 0} className="flex min-h-10 items-center gap-1 rounded-full bg-neutral-100 px-4 text-sm font-semibold text-neutral-700 disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Back</button>
                          <button type="button" onClick={() => moveStep(recipe, 1)} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full bg-[#17131f] px-4 text-sm font-semibold text-white transition hover:bg-[#800020]">{stepIndex >= instructions.length - 1 ? "Finish dish" : "Next"}<ArrowRight className="h-4 w-4" /></button>
                        </div>
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          </main>
        )}


        {confirmingExit && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#fffdfb] p-5 text-[#17131f] shadow-2xl">
              <h3 className="text-lg font-semibold">Exit batch cooking?</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                These dishes have not been saved as attempts yet. Exit anyway?
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingExit(false)}
                  className="flex min-h-10 flex-1 items-center justify-center rounded-full bg-neutral-100 px-4 text-sm font-semibold text-neutral-800"
                >
                  Keep cooking
                </button>
                <button
                  type="button"
                  onClick={confirmExit}
                  className="flex min-h-10 flex-1 items-center justify-center rounded-full bg-[#800020] px-4 text-sm font-semibold text-white"
                >
                  Exit session
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="border-t border-white/10 bg-[#17131f]/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <button type="button" onClick={reviewing ? () => setReviewing(false) : requestClose} className="flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15">
              <ArrowLeft className="h-4 w-4" />
              {reviewing ? "Back" : "Close"}
            </button>
            {reviewing ? (
              <button type="button" onClick={saveAttempts} disabled={saving} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#f7c86a] px-6 text-sm font-bold text-[#17131f] transition hover:bg-[#ffd98a] disabled:opacity-60 sm:flex-none">
                {saving ? "Saving..." : "Save all attempts"}
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={() => setReviewing(true)} disabled={!allComplete} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#f7c86a] px-6 text-sm font-bold text-[#17131f] transition hover:bg-[#ffd98a] disabled:opacity-45 sm:flex-none">
                Review dishes
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
