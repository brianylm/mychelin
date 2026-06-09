"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@radix-ui/themes";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Clock3,
  Minus,
  PencilLine,
  Plus,
  TimerReset,
  X,
} from "lucide-react";
import { StarIcon, StarFilledIcon } from "@radix-ui/react-icons";
import type { RecipeWithRelations } from "@/store/RecipeStore";
import { playTimerAlarm, primeTimerAlarm } from "@/lib/timer-alarm";
import { detectStepTimerSeconds } from "@/lib/step-timers";

interface CookWithMeSessionProps {
  recipe: RecipeWithRelations;
  onClose: () => void;
  onComplete?: () => void | Promise<void>;
  mealPlanId?: number | null;
}

type TimerState = {
  duration: number;
  remaining: number;
  running: boolean;
};


function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

function HalfStarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Dish rating">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = value >= star ? "full" : value >= star - 0.5 ? "half" : "empty";
          return (
            <div key={star} className="relative h-11 w-11">
              <StarIcon className="absolute inset-1 h-9 w-9 text-white/30" />
              {fill !== "empty" && (
                <div
                  className={fill === "half" ? "absolute inset-1 w-[18px] overflow-hidden" : "absolute inset-1"}
                  aria-hidden="true"
                >
                  <StarFilledIcon className="h-9 w-9 text-[#f7c86a]" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onChange(star - 0.5)}
                className="absolute inset-y-0 left-0 w-1/2 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#f7c86a]/50"
                role="radio"
                aria-checked={value === star - 0.5}
                aria-label={
                  "Rate " + (star - 0.5).toFixed(1).replace(".0", "") + " out of 5"
                }
              />
              <button
                type="button"
                onClick={() => onChange(star)}
                className="absolute inset-y-0 right-0 w-1/2 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-[#f7c86a]/50"
                role="radio"
                aria-checked={value === star}
                aria-label={"Rate " + star + " out of 5"}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
        <span>Needs work</span>
        <span className="text-white/70">{value > 0 ? value.toFixed(1).replace(".0", "") + "/5" : "Not rated"}</span>
        <span>Cook again</span>
      </div>
    </div>
  );
}

export function CookWithMeSession({
  recipe,
  onClose,
  onComplete,
  mealPlanId,
}: CookWithMeSessionProps) {
  const instructions = recipe.instructions ?? [];
  const [stepIndex, setStepIndex] = useState(0);
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
  const previousTimersRef = useRef<Record<number, TimerState>>({});
  const [changeNotes, setChangeNotes] = useState<string[]>([]);
  const [changeDraft, setChangeDraft] = useState("");
  const [showChangeCapture, setShowChangeCapture] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [dishRating, setDishRating] = useState(0);
  const [nextTimeNotes, setNextTimeNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentInstruction = instructions[stepIndex];
  const totalSteps = instructions.length;
  const progress = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  const currentTimer = timers[stepIndex];
  const hasContent = totalSteps > 0;

  const sessionSummary = useMemo(() => {
    const parts: string[] = [];
    if (changeNotes.length > 0) {
      parts.push("Changes made during cooking:");
      changeNotes.forEach((note, index) => {
        parts.push(`${index + 1}. ${note}`);
      });
    }
    if (dishRating > 0) {
      parts.push(`Dish rating: ${dishRating}/5`);
    }
    if (nextTimeNotes.trim()) {
      parts.push(`Next time: ${nextTimeNotes.trim()}`);
    }
    return parts.join("\n");
  }, [changeNotes, dishRating, nextTimeNotes]);

  useEffect(() => {
    const activeEntries = Object.entries(timers).filter(
      ([, timer]) => timer.running && timer.remaining > 0
    );
    if (activeEntries.length === 0) return;

    const interval = window.setInterval(() => {
      setTimers((current) => {
        const next = { ...current };
        for (const [key, timer] of Object.entries(current)) {
          if (!timer.running) continue;
          const remaining = Math.max(0, timer.remaining - 1);
          next[Number(key)] = {
            ...timer,
            remaining,
            running: remaining > 0,
          };
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timers]);


  useEffect(() => {
    const previous = previousTimersRef.current;
    const completed = Object.entries(timers).some(([key, timer]) => {
      const before = previous[Number(key)];
      return Boolean(before?.running && before.remaining > 0 && timer.remaining === 0 && !timer.running);
    });
    previousTimersRef.current = timers;
    if (completed) playTimerAlarm();
  }, [timers]);

  const ensureTimer = useCallback(() => {
    if (!currentInstruction) return;
    primeTimerAlarm();
    setTimers((current) => {
      if (current[stepIndex]) return current;
      const duration = detectStepTimerSeconds(currentInstruction.content);
      return {
        ...current,
        [stepIndex]: { duration, remaining: duration, running: false },
      };
    });
  }, [currentInstruction, stepIndex]);

  const toggleTimer = useCallback(() => {
    if (!currentInstruction) return;
    setTimers((current) => {
      const existing = current[stepIndex];
      const duration = existing?.duration ?? detectStepTimerSeconds(currentInstruction.content);
      return {
        ...current,
        [stepIndex]: {
          duration,
          remaining: existing?.remaining ?? duration,
          running: !(existing?.running ?? false),
        },
      };
    });
  }, [currentInstruction, stepIndex]);

  const adjustTimer = useCallback((deltaSeconds: number) => {
    if (!currentInstruction) return;
    setTimers((current) => {
      const existing = current[stepIndex];
      const duration = existing?.duration ?? detectStepTimerSeconds(currentInstruction.content);
      const remaining = Math.max(0, (existing?.remaining ?? duration) + deltaSeconds);
      return {
        ...current,
        [stepIndex]: {
          duration: Math.max(60, duration + deltaSeconds),
          remaining,
          running: existing?.running ?? false,
        },
      };
    });
  }, [currentInstruction, stepIndex]);

  const resetTimer = useCallback(() => {
    if (!currentInstruction) return;
    setTimers((current) => {
      const duration = current[stepIndex]?.duration ?? detectStepTimerSeconds(currentInstruction.content);
      return {
        ...current,
        [stepIndex]: { duration, remaining: duration, running: false },
      };
    });
  }, [currentInstruction, stepIndex]);

  const saveChangeNote = useCallback(() => {
    const trimmed = changeDraft.trim();
    if (!trimmed) return;
    const stepLabel = currentInstruction
      ? `Step ${currentInstruction.stepNumber}: ${trimmed}`
      : trimmed;
    setChangeNotes((notes) => [...notes, stepLabel]);
    setChangeDraft("");
    setShowChangeCapture(false);
  }, [changeDraft, currentInstruction]);

  const goNext = useCallback(() => {
    if (stepIndex >= totalSteps - 1) {
      setCompleted(true);
      return;
    }
    setStepIndex((index) => Math.min(totalSteps - 1, index + 1));
    setShowChangeCapture(false);
  }, [stepIndex, totalSteps]);

  const goBack = useCallback(() => {
    if (completed) {
      setCompleted(false);
      return;
    }
    setStepIndex((index) => Math.max(0, index - 1));
    setShowChangeCapture(false);
  }, [completed]);


  const requestClose = useCallback(() => {
    setConfirmingExit(true);
  }, []);

  const confirmExit = useCallback(() => {
    setConfirmingExit(false);
    onClose();
  }, [onClose]);

  const saveSession = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: recipe.activeVersionId ?? null,
          mealPlanId: mealPlanId ?? null,
          rating: dishRating || null,
          notes: sessionSummary || null,
          changeNotes,
          nextTime: nextTimeNotes.trim() || null,
          ingredientsSnapshot: toAttemptIngredients(recipe),
          instructionsSnapshot: toAttemptInstructions(recipe),
          cookedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save cooking attempt");
      }

      await onComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cooking attempt");
    } finally {
      setSaving(false);
    }
  }, [changeNotes, dishRating, mealPlanId, nextTimeNotes, onClose, onComplete, recipe, sessionSummary]);

  return (
    <div className="fixed inset-0 z-50 bg-[#17131f] text-white">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#17131f]/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={requestClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Close cook with me"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 px-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Cook with me
            </p>
            <h2 className="truncate text-sm font-semibold text-white">{recipe.title}</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#800020] text-white">
            <ChefHat className="h-5 w-5" />
          </div>
        </header>

        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-[#f7c86a] transition-all duration-300"
            style={{ width: completed ? "100%" : `${progress}%` }}
          />
        </div>

        {!hasContent ? (
          <main className="flex flex-1 items-center justify-center px-6 text-center">
            <div className="max-w-sm">
              <ChefHat className="mx-auto mb-4 h-12 w-12 text-[#f7c86a]" />
              <h3 className="text-2xl font-semibold">Add steps first</h3>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Cook-with-me needs recipe steps so it can guide you through the dish.
              </p>
              <Button className="mt-6" onClick={requestClose}>Back to recipe</Button>
            </div>
          </main>
        ) : completed ? (
          <main className="flex-1 overflow-y-auto px-5 py-6">
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f7c86a]">
                  Session complete
                </p>
                <h3 className="mt-3 text-3xl font-semibold leading-tight">
                  How would you rate this dish?
                </h3>

                <div className="mt-6">
                  <HalfStarRating value={dishRating} onChange={setDishRating} />
                </div>

                <label className="mt-6 block text-sm font-medium text-white/80">
                  What should change next time?
                </label>
                <textarea
                  value={nextTimeNotes}
                  onChange={(event) => setNextTimeNotes(event.target.value)}
                  rows={4}
                  placeholder="Texture, timing, seasoning, missing family trick..."
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#f7c86a]/70 focus:ring-2 focus:ring-[#f7c86a]/15"
                />

                {changeNotes.length > 0 && (
                  <div className="mt-5 rounded-2xl bg-black/20 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                      Changes noted
                    </p>
                    <ul className="space-y-2 text-sm text-white/75">
                      {changeNotes.map((note, index) => (
                        <li key={`${note}-${index}`}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {error && (
                  <p className="mt-4 rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center">
              <div className="mb-5 flex items-center justify-between text-sm text-white/55">
                <span>Step {stepIndex + 1} of {totalSteps}</span>
                <span>{changeNotes.length} change{changeNotes.length === 1 ? "" : "s"} noted</span>
              </div>

              <section className="rounded-[2rem] border border-white/10 bg-[#fffdfb] p-5 text-[#17131f] shadow-2xl sm:p-7">
                <div className="flex items-center gap-3 text-[#800020]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#800020]/10 text-sm font-bold">
                    {currentInstruction?.stepNumber ?? stepIndex + 1}
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                    Next step
                  </p>
                </div>

                <p className="mt-6 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                  {currentInstruction?.content}
                </p>

                {currentInstruction?.tip && (
                  <p className="mt-5 rounded-2xl bg-[#800020]/5 px-4 py-3 text-base leading-7 text-[#521224]">
                    {currentInstruction.tip}
                  </p>
                )}

                <div className="mt-6 rounded-2xl border border-[#800020]/10 bg-[#800020]/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Clock3 className="h-5 w-5 text-[#800020]" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#800020]">
                          Timer
                        </p>
                        <p className="font-mono text-3xl font-semibold text-[#17131f]">
                          {formatTime(currentTimer?.remaining ?? detectStepTimerSeconds(currentInstruction?.content ?? ""))}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        ensureTimer();
                        toggleTimer();
                      }}
                      className="rounded-full bg-[#17131f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#800020]"
                    >
                      {currentTimer?.running ? "Pause" : "Start"}
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => adjustTimer(-60)}
                      className="flex items-center justify-center gap-0.5 whitespace-nowrap rounded-xl bg-white px-2 py-2 text-[11px] font-medium text-neutral-700 shadow-sm"
                    >
                      <Minus className="h-3.5 w-3.5" /> -1m
                    </button>
                    <button
                      type="button"
                      onClick={resetTimer}
                      className="flex items-center justify-center gap-0.5 whitespace-nowrap rounded-xl bg-white px-2 py-2 text-[11px] font-medium text-neutral-700 shadow-sm"
                    >
                      <TimerReset className="h-3.5 w-3.5" /> Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTimer(60)}
                      className="flex items-center justify-center gap-0.5 whitespace-nowrap rounded-xl bg-white px-2 py-2 text-[11px] font-medium text-neutral-700 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" /> +1m
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
                {showChangeCapture ? (
                  <div>
                    <label className="text-sm font-medium text-white/80">
                      What changed on this step?
                    </label>
                    <textarea
                      value={changeDraft}
                      onChange={(event) => setChangeDraft(event.target.value)}
                      rows={3}
                      autoFocus
                      placeholder="I used less soy sauce, cooked longer, swapped ingredient..."
                      className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#f7c86a]/70 focus:ring-2 focus:ring-[#f7c86a]/15"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={saveChangeNote}
                        className="rounded-full bg-[#f7c86a] px-4 py-2 text-sm font-semibold text-[#17131f]"
                      >
                        Save note
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowChangeCapture(false)}
                        className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowChangeCapture(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#f7c86a]/40 bg-[#f7c86a]/10 px-4 py-4 text-base font-semibold text-[#f7c86a] transition hover:bg-[#f7c86a]/15"
                  >
                    <PencilLine className="h-5 w-5" />
                    I changed something
                  </button>
                )}
              </section>
            </div>
          </main>
        )}


        {confirmingExit && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#fffdfb] p-5 text-[#17131f] shadow-2xl">
              <h3 className="text-lg font-semibold">Exit cook-with-me?</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                This session has not been saved as an attempt yet. Exit anyway?
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
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={!completed && stepIndex === 0}
              className="flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-35"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {completed ? (
              <button
                type="button"
                onClick={saveSession}
                disabled={saving}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#f7c86a] px-6 text-sm font-bold text-[#17131f] transition hover:bg-[#ffd98a] disabled:opacity-60 sm:flex-none"
              >
                {saving ? "Saving..." : "Save session"}
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#f7c86a] px-6 text-sm font-bold text-[#17131f] transition hover:bg-[#ffd98a] sm:flex-none"
              >
                {stepIndex >= totalSteps - 1 ? "Finish" : "Next step"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
