"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Minus,
  PencilLine,
  Plus,
  TimerReset,
  X,
} from "lucide-react";
import type { RecipeWithRelations } from "@/store/RecipeStore";
import { playTimerAlarm, primeTimerAlarm } from "@/lib/timer-alarm";
import { detectStepTimerSeconds } from "@/lib/step-timers";
import { encodeHeatInTip, HEAT_CONFIG, HEAT_LEVELS, parseHeatFromTip, type HeatLevel } from "@/lib/instruction-heat";
import { HeatChip } from "./HeatChip";
import { matchIngredientsForStep } from "@/lib/step-ingredient-amounts";
import { requestLeftovers } from "@/lib/leftovers-prompt";

interface CookWithMeSessionProps {
  recipe: RecipeWithRelations;
  onClose: () => void;
  onComplete?: () => void | Promise<void>;
  mealPlanId?: number | null;
  // Practice mode (Slice 3 household): the cook does not own this recipe
  // (e.g. a household-shared recipe they haven't imported). Nothing is
  // persisted — no attempt, no next-try, no inventory deduction. The
  // session still runs end-to-end and onComplete fires so a plan slot can
  // be marked cooked.
  ephemeral?: boolean;
  // Active private next try for this recipe, surfaced at session start so
  // last cook's improvement notes shape this session.
  nextTry?: { notes: string | null; ingredientCount: number; stepCount: number } | null;
}

type TimerState = {
  duration: number;
  remaining: number;
  running: boolean;
};

type SessionIngredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  approximate?: boolean | null;
  quantityText?: string | null;
  notes?: string | null;
};

type SessionInstruction = {
  stepNumber: number;
  content: string;
  tip?: string | null;
  imageUrl?: string | null;
};

const SNAPSHOT_UNITS = ["", "g", "kg", "ml", "L", "tsp", "tbsp", "cup", "pcs", "slice", "clove", "pinch", "handful", "bunch", "stalk", "can", "packet"];


function normalizeInstructions(instructions: SessionInstruction[]): SessionInstruction[] {
  return instructions.map((instruction, index) => ({
    ...instruction,
    stepNumber: index + 1,
    content: instruction.content.trim() || "Untitled step",
  }));
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function toAttemptIngredients(recipe: RecipeWithRelations): SessionIngredient[] {
  return (recipe.ingredients ?? []).map((ingredient) => ({
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    approximate: ingredient.approximate,
    quantityText: ingredient.quantityText,
    notes: ingredient.notes,
  }));
}

function toAttemptInstructions(recipe: RecipeWithRelations): SessionInstruction[] {
  return (recipe.instructions ?? []).map((instruction) => ({
    stepNumber: instruction.stepNumber,
    content: instruction.content,
    tip: instruction.tip,
    imageUrl: instruction.imageUrl,
  }));
}

export function CookWithMeSession({
  recipe,
  onClose,
  onComplete,
  mealPlanId,
  nextTry,
  ephemeral,
}: CookWithMeSessionProps) {
  const [actualIngredients, setActualIngredients] = useState<SessionIngredient[]>(() => toAttemptIngredients(recipe));
  const [actualInstructions, setActualInstructions] = useState<SessionInstruction[]>(() => toAttemptInstructions(recipe));
  const [nextTryIngredients, setNextTryIngredients] = useState<SessionIngredient[]>(() => toAttemptIngredients(recipe));
  const [nextTryInstructions, setNextTryInstructions] = useState<SessionInstruction[]>(() => toAttemptInstructions(recipe));
  const instructions = actualInstructions;
  const [stepIndex, setStepIndex] = useState(0);
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
  const previousTimersRef = useRef<Record<number, TimerState>>({});
  const [changeNotes, setChangeNotes] = useState<string[]>([]);
  const [changeDraft, setChangeDraft] = useState("");
  const [showChangeCapture, setShowChangeCapture] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [nextTimeNotes, setNextTimeNotes] = useState("");
  const [saveNextTry, setSaveNextTry] = useState(false);
  const [showNextTryEditor, setShowNextTryEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextTryBannerDismissed, setNextTryBannerDismissed] = useState(false);
  // Household cook-time deduction (Slice 2): when the attempt response
  // carries a deduction proposal (own recipe + meal on the household
  // plan), the session shows a one-click confirm sheet with editable
  // quantities instead of closing immediately. Never fires for cooks of
  // other people's recipes — the server gates that.
  const [deduction, setDeduction] = useState<{
    mealPlanId: number;
    items: Array<{
      name: string;
      unit: string;
      quantity: number;
      catalogIngredientId: number | null;
      onHand: number | null;
    }>;
    notTracked: string[];
  } | null>(null);
  const [deductionDrafts, setDeductionDrafts] = useState<Record<number, string>>({});
  const [deducting, setDeducting] = useState(false);

  const currentInstruction = instructions[stepIndex];
  const currentStepMeta = parseHeatFromTip(currentInstruction?.tip);
  const currentStepIngredients = useMemo(
    () => matchIngredientsForStep(currentInstruction?.content ?? "", actualIngredients),
    [actualIngredients, currentInstruction?.content]
  );
  const currentStepIngredientEdits = useMemo(() => {
    const names = new Set(currentStepIngredients.map((hint) => hint.name.toLowerCase()));
    return actualIngredients
      .map((ingredient, index) => ({ ingredient, index }))
      .filter(({ ingredient }) => names.has(ingredient.name.toLowerCase()));
  }, [actualIngredients, currentStepIngredients]);
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
    if (nextTimeNotes.trim()) {
      parts.push(`Next time: ${nextTimeNotes.trim()}`);
    }
    return parts.join("\n");
  }, [changeNotes, nextTimeNotes]);

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

  const updateActualInstruction = useCallback((index: number, patch: Partial<SessionInstruction>) => {
    setActualInstructions((items) =>
      items.map((instruction, itemIndex) =>
        itemIndex === index ? { ...instruction, ...patch } : instruction
      )
    );
  }, []);

  const updateActualInstructionHeat = useCallback((index: number, heat: HeatLevel) => {
    setActualInstructions((items) =>
      items.map((instruction, itemIndex) => {
        if (itemIndex !== index) return instruction;
        const { cleanTip } = parseHeatFromTip(instruction.tip);
        return { ...instruction, tip: encodeHeatInTip(heat, cleanTip) };
      })
    );
  }, []);

  const updateActualIngredient = useCallback((index: number, patch: Partial<SessionIngredient>) => {
    setActualIngredients((items) =>
      items.map((ingredient, itemIndex) =>
        itemIndex === index ? { ...ingredient, ...patch } : ingredient
      )
    );
  }, []);

  const updateNextTryIngredient = useCallback((index: number, patch: Partial<SessionIngredient>) => {
    setSaveNextTry(true);
    setNextTryIngredients((items) =>
      items.map((ingredient, itemIndex) =>
        itemIndex === index ? { ...ingredient, ...patch } : ingredient
      )
    );
  }, []);

  const updateNextTryInstruction = useCallback((index: number, patch: Partial<SessionInstruction>) => {
    setSaveNextTry(true);
    setNextTryInstructions((items) =>
      items.map((instruction, itemIndex) =>
        itemIndex === index ? { ...instruction, ...patch } : instruction
      )
    );
  }, []);

  const saveChangeNote = useCallback(() => {
    const trimmed = changeDraft.trim();
    const stepLabel = currentInstruction
      ? `Step ${currentInstruction.stepNumber}: ${trimmed || "Updated step, heat, or ingredient amounts"}`
      : trimmed || "Updated cooking details";
    setChangeNotes((notes) => [...notes, stepLabel]);
    setNextTryIngredients(actualIngredients);
    setNextTryInstructions(actualInstructions);
    if (!ephemeral) setSaveNextTry(true);
    setChangeDraft("");
    setShowChangeCapture(false);
  }, [actualIngredients, actualInstructions, changeDraft, currentInstruction, ephemeral]);

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
    if (ephemeral) {
      // Practice cook on a recipe the cook doesn't own: persist nothing,
      // but still signal completion so a plan slot can be marked cooked
      // (and the caller's post-cook flow runs).
      await onComplete?.();
      onClose();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: recipe.activeVersionId ?? null,
          mealPlanId: mealPlanId ?? null,
          notes: sessionSummary || null,
          changeNotes,
          nextTime: nextTimeNotes.trim() || null,
          ingredientsSnapshot: actualIngredients,
          instructionsSnapshot: normalizeInstructions(actualInstructions),
          cookedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save cooking attempt");
      }

      const savedAttempt = await response.json().catch(() => null);

      if (saveNextTry) {
        const nextTryResponse = await fetch(`/api/recipes/${recipe.id}/next-try`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceAttemptId: savedAttempt?.id ?? null,
            notes: nextTimeNotes.trim() || sessionSummary || null,
            ingredients: nextTryIngredients,
            instructions: normalizeInstructions(nextTryInstructions),
          }),
        });
        if (!nextTryResponse.ok) {
          const body = await nextTryResponse.json().catch(() => ({}));
          throw new Error(body.error || "Attempt saved, but next try could not be saved");
        }
      }

      requestLeftovers({ recipeId: recipe.id, title: recipe.title, mealPlanId: mealPlanId ?? null });

      const proposal = savedAttempt?.deduction;
      if (
        proposal &&
        Array.isArray(proposal.items) &&
        (proposal.items.length > 0 || (proposal.notTracked ?? []).length > 0)
      ) {
        // Household deduction proposal — hand off to the confirm sheet;
        // it closes the session after confirm/skip.
        setDeduction(proposal);
        setDeductionDrafts(
          Object.fromEntries(
            proposal.items.map((item: { quantity: number }, index: number) => [
              index,
              String(item.quantity),
            ])
          )
        );
        return;
      }

      await onComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cooking attempt");
    } finally {
      setSaving(false);
    }
  }, [actualIngredients, actualInstructions, changeNotes, ephemeral, mealPlanId, nextTimeNotes, nextTryIngredients, nextTryInstructions, onClose, onComplete, recipe, saveNextTry, sessionSummary]);

  const finishDeduction = useCallback(
    async (confirm: boolean) => {
      if (!deduction) return;
      if (confirm) {
        setDeducting(true);
        try {
          const items = deduction.items
            .map((item, index) => ({
              name: item.name,
              unit: item.unit,
              catalogIngredientId: item.catalogIngredientId,
              quantity: parseFloat(deductionDrafts[index] ?? "") || 0,
            }))
            .filter((item) => item.quantity > 0);
          const response = await fetch("/api/households/inventory/deduct", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mealPlanId: deduction.mealPlanId, items }),
          });
          if (!response.ok) {
            // Best-effort: the attempt is already saved; a failed
            // deduction must not trap the cook in the session.
            console.warn("inventory deduction failed", await response.text().catch(() => ""));
          }
        } catch (deductError) {
          console.warn("inventory deduction failed", deductError);
        } finally {
          setDeducting(false);
        }
      }
      await onComplete?.();
      onClose();
    },
    [deduction, deductionDrafts, onComplete, onClose]
  );

  return (
    <div className="fixed inset-0 z-50 bg-ui-night text-ui-night-text">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-ui-night-line bg-ui-action px-4 py-3">
          <button
            type="button"
            onClick={requestClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ui-night-raised text-ui-action-text transition hover:bg-ui-night-line"
            aria-label="Close cook with me"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 px-3 text-center">
            <p className="text-xs font-semibold text-ui-night-muted">
              Cook with me
            </p>
            <h2 className="truncate text-sm font-semibold text-ui-action-text">{recipe.title}</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ui-accent text-ui-action-text">
            <ChefHat className="h-5 w-5" />
          </div>
        </header>

        <div className="h-1 bg-ui-night-raised">
          <div
            className="h-full bg-ui-highlight transition-[width] duration-300"
            style={{ width: completed ? "100%" : `${progress}%` }}
          />
        </div>

        {nextTry && !nextTryBannerDismissed && !completed && (
          <div className="border-b border-ui-night-line bg-ui-night-raised px-4 py-3">
            <div className="mx-auto flex max-w-2xl items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ui-highlight">
                  From your next try
                </p>
                {nextTry.notes && (
                  <p className="mt-1 text-sm leading-5 text-ui-night-text">{nextTry.notes}</p>
                )}
                {(nextTry.ingredientCount > 0 || nextTry.stepCount > 0) && (
                  <p className="mt-1 text-xs text-ui-night-muted">
                    {[nextTry.ingredientCount > 0 ? `${nextTry.ingredientCount} ingredient tweak${nextTry.ingredientCount === 1 ? "" : "s"}` : null, nextTry.stepCount > 0 ? `${nextTry.stepCount} step tweak${nextTry.stepCount === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ")} planned for this cook
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setNextTryBannerDismissed(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ui-night-muted transition hover:bg-ui-night-raised hover:text-ui-action-text"
                aria-label="Dismiss next try notes"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {!hasContent ? (
          <main className="flex flex-1 items-center justify-center px-6 text-center">
            <div className="max-w-sm">
              <ChefHat className="mx-auto mb-4 h-12 w-12 text-ui-highlight" />
              <h3 className="text-2xl font-semibold">Add steps first</h3>
              <p className="mt-3 text-sm leading-6 text-ui-night-muted">
                Cook-with-me needs recipe steps so it can guide you through the dish.
              </p>
              <Button variant="primary" className="mt-6" onClick={requestClose}>Back to recipe</Button>
            </div>
          </main>
        ) : completed ? (
          <main className="flex-1 overflow-y-auto px-5 py-6">
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center">
              <div className="rounded-2xl bg-ui-night-raised p-5 shadow-2xl">
                <p className="text-xs font-semibold text-ui-highlight">
                  Session complete
                </p>
                <h3 className="mt-3 text-3xl font-semibold leading-tight">
                  Nice cook!
                </h3>
                <p className="mt-3 text-sm leading-6 text-ui-night-muted">
                  {ephemeral
                    ? "This is a practice cook of a shared recipe — nothing is saved. Import it to keep your own attempts."
                    : "Rate how the dish tasted later from Activity after eating."}
                </p>

                {!ephemeral && (
                  <label className="mt-6 block text-sm font-medium text-ui-night-text">
                    What should change next time?
                  </label>
                )}
                {!ephemeral && (
                  <textarea
                    value={nextTimeNotes}
                    onChange={(event) => {
                      setNextTimeNotes(event.target.value);
                      if (event.target.value.trim()) setSaveNextTry(true);
                    }}
                    rows={4}
                    placeholder="Texture, timing, seasoning, missing family trick..."
                    className="mt-2 w-full resize-none rounded-2xl border border-ui-night-line bg-ui-night-raised px-4 py-3 text-sm text-ui-action-text outline-none transition placeholder:text-ui-night-muted focus:border-ui-highlight focus:ring-2 focus:ring-ui-focus-soft"
                  />
                )}

                {!ephemeral && (
                <div className="mt-4 rounded-2xl border border-ui-night-line bg-ui-night-raised p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={saveNextTry}
                      onChange={(event) => setSaveNextTry(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-ui-night-line bg-ui-night-raised accent-ui-highlight"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ui-action-text">Save as private next try</span>
                      <span className="block text-xs leading-5 text-ui-night-muted">Keeps this as the version to test next time without changing the definitive recipe.</span>
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setShowNextTryEditor((open) => !open);
                      setSaveNextTry(true);
                    }}
                    className="mt-3 rounded-xl border border-ui-highlight px-3 py-2 text-xs font-semibold text-ui-highlight transition hover:bg-ui-night-raised"
                  >
                    {showNextTryEditor ? "Hide next try draft" : "Edit next try draft"}
                  </button>

                  {showNextTryEditor && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-ui-night-muted">Ingredients next time</p>
                        <div className="mt-2 space-y-2">
                          {nextTryIngredients.map((ingredient, index) => (
                            <div key={index} className="grid grid-cols-[1fr_72px_84px] gap-2">
                              <input
                                value={ingredient.name}
                                onChange={(event) => updateNextTryIngredient(index, { name: event.target.value })}
                                className="min-w-0 rounded-xl border border-ui-night-line bg-ui-night-raised px-3 py-2 text-sm text-ui-action-text outline-none focus:border-ui-highlight"
                              />
                              <input
                                value={ingredient.quantity ?? ""}
                                onChange={(event) => updateNextTryIngredient(index, { quantity: event.target.value ? Number(event.target.value) : null })}
                                inputMode="decimal"
                                className="rounded-xl border border-ui-night-line bg-ui-night-raised px-2 py-2 text-sm text-ui-action-text outline-none focus:border-ui-highlight"
                                placeholder="qty"
                              />
                              <select
                                value={ingredient.unit ?? ""}
                                onChange={(event) => updateNextTryIngredient(index, { unit: event.target.value || null })}
                                className="rounded-xl border border-ui-night-line bg-ui-night-raised px-2 py-2 text-sm text-ui-action-text outline-none focus:border-ui-highlight"
                              >
                                {SNAPSHOT_UNITS.map((unit) => (
                                  <option key={unit || "none"} value={unit} className="text-ui-action">{unit || "unit"}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-ui-night-muted">Steps next time</p>
                        <div className="mt-2 space-y-2">
                          {nextTryInstructions.map((instruction, index) => {
                            const { heat } = parseHeatFromTip(instruction.tip);
                            return (
                              <div key={index}>
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ui-night-raised text-xs font-semibold text-ui-night-text">{index + 1}</span>
                                  <select
                                    value={heat ?? ""}
                                    onChange={(event) => {
                                      const { cleanTip } = parseHeatFromTip(instruction.tip);
                                      updateNextTryInstruction(index, { tip: encodeHeatInTip((event.target.value || null) as HeatLevel, cleanTip) });
                                    }}
                                    className="rounded-lg border border-ui-night-line bg-ui-night-raised px-2 py-1 text-xs text-ui-action-text outline-none"
                                  >
                                    {HEAT_LEVELS.map((level) => (
                                      <option key={level ?? "none"} value={level ?? ""} className="text-ui-action">
                                        {level && HEAT_CONFIG[level] ? HEAT_CONFIG[level].shortLabel : "No heat"}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <textarea
                                  value={instruction.content}
                                  onChange={(event) => updateNextTryInstruction(index, { content: event.target.value })}
                                  rows={2}
                                  className="w-full resize-none rounded-xl border border-ui-night-line bg-ui-night-raised px-3 py-2 text-sm text-ui-action-text outline-none focus:border-ui-highlight"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                )}

                {changeNotes.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold text-ui-night-muted">
                      Changes noted
                    </p>
                    <ul className="space-y-2 text-sm text-ui-night-text">
                      {changeNotes.map((note, index) => (
                        <li key={`${note}-${index}`}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {error && (
                  <p className="mt-4 rounded-xl bg-ui-danger-soft px-3 py-2 text-sm text-ui-danger">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center">
              <div className="mb-5 flex items-center justify-between text-sm text-ui-night-muted">
                <span>Step {stepIndex + 1} of {totalSteps}</span>
                <span>{changeNotes.length} change{changeNotes.length === 1 ? "" : "s"} noted</span>
              </div>

              <section className="rounded-2xl bg-ui-surface-raised p-5 text-ui-text sm:p-7">
                {currentStepMeta.heat && <HeatChip heat={currentStepMeta.heat} />}

                <p className="mt-2 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                  {currentInstruction?.content}
                </p>

                {currentStepIngredients.length > 0 && (
                  <ul className="mt-6 space-y-1 text-lg text-ui-text" aria-label="Amounts in this step">
                    {currentStepIngredients.map((hint) => (
                      <li key={hint.name} className="flex gap-2">
                        <span className="shrink-0 font-semibold">{hint.amount}</span>
                        <span className="min-w-0">{hint.name}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {currentStepMeta.cleanTip && (
                  <p className="mt-6 text-base leading-7 text-ui-muted">{currentStepMeta.cleanTip}</p>
                )}

                <div className="mt-8">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-4xl font-semibold text-ui-text" aria-label="Timer">
                      {formatTime(currentTimer?.remaining ?? detectStepTimerSeconds(currentInstruction?.content ?? ""))}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        ensureTimer();
                        toggleTimer();
                      }}
                      className="min-h-11 rounded-xl bg-ui-action px-6 py-3 text-base font-semibold text-ui-action-text transition hover:bg-ui-accent"
                    >
                      {currentTimer?.running ? "Pause" : "Start"}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => adjustTimer(-60)}
                      className="flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-xl text-sm font-medium text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
                    >
                      <Minus className="h-4 w-4" /> 1 min
                    </button>
                    <button
                      type="button"
                      onClick={resetTimer}
                      className="flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-xl text-sm font-medium text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
                    >
                      <TimerReset className="h-4 w-4" /> Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTimer(60)}
                      className="flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-xl text-sm font-medium text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
                    >
                      <Plus className="h-4 w-4" /> 1 min
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-4">
                {showChangeCapture ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-ui-night-text">
                        This cook
                      </label>
                      <textarea
                        value={currentInstruction?.content ?? ""}
                        onChange={(event) => updateActualInstruction(stepIndex, { content: event.target.value })}
                        rows={3}
                        autoFocus
                        className="mt-2 w-full resize-none rounded-2xl border border-ui-night-line bg-ui-night-raised px-4 py-3 text-sm text-ui-action-text outline-none placeholder:text-ui-night-muted focus:border-ui-highlight focus:ring-2 focus:ring-ui-focus-soft"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                      <label className="block">
                        <span className="text-xs font-semibold text-ui-night-muted">Heat used</span>
                        <select
                          value={currentStepMeta.heat ?? ""}
                          onChange={(event) => updateActualInstructionHeat(stepIndex, (event.target.value || null) as HeatLevel)}
                          className="mt-1 w-full rounded-xl border border-ui-night-line bg-ui-night-raised px-3 py-2 text-sm text-ui-action-text outline-none focus:border-ui-highlight"
                        >
                          {HEAT_LEVELS.map((heat) => (
                            <option key={heat ?? "none"} value={heat ?? ""} className="text-ui-action">
                              {heat && HEAT_CONFIG[heat] ? HEAT_CONFIG[heat].label : "No heat"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-ui-night-muted">Timer tried</span>
                        <div className="mt-1 rounded-xl border border-ui-night-line bg-ui-night-raised px-3 py-2 font-mono text-sm text-ui-action-text">
                          {formatTime(currentTimer?.duration ?? detectStepTimerSeconds(currentInstruction?.content ?? ""))}
                        </div>
                      </label>
                    </div>

                    {currentStepIngredientEdits.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-ui-night-muted">Amounts used</p>
                        <div className="mt-2 space-y-2">
                          {currentStepIngredientEdits.map(({ ingredient, index }) => (
                            <div key={index} className="grid grid-cols-[1fr_72px_84px] gap-2">
                              <input
                                value={ingredient.name}
                                onChange={(event) => updateActualIngredient(index, { name: event.target.value })}
                                className="min-w-0 rounded-xl border border-ui-night-line bg-ui-night-raised px-3 py-2 text-sm text-ui-action-text outline-none focus:border-ui-highlight"
                              />
                              <input
                                value={ingredient.quantity ?? ""}
                                onChange={(event) => updateActualIngredient(index, { quantity: event.target.value ? Number(event.target.value) : null })}
                                inputMode="decimal"
                                className="rounded-xl border border-ui-night-line bg-ui-night-raised px-2 py-2 text-sm text-ui-action-text outline-none focus:border-ui-highlight"
                                placeholder="qty"
                              />
                              <select
                                value={ingredient.unit ?? ""}
                                onChange={(event) => updateActualIngredient(index, { unit: event.target.value || null })}
                                className="rounded-xl border border-ui-night-line bg-ui-night-raised px-2 py-2 text-sm text-ui-action-text outline-none focus:border-ui-highlight"
                              >
                                {SNAPSHOT_UNITS.map((unit) => (
                                  <option key={unit || "none"} value={unit} className="text-ui-action">{unit || "unit"}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <textarea
                      value={changeDraft}
                      onChange={(event) => setChangeDraft(event.target.value)}
                      rows={2}
                      placeholder="Optional note: why this changed, sensory cue, family tip..."
                      className="w-full resize-none rounded-2xl border border-ui-night-line bg-ui-night-raised px-4 py-3 text-sm text-ui-action-text outline-none placeholder:text-ui-night-muted focus:border-ui-highlight focus:ring-2 focus:ring-ui-focus-soft"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveChangeNote}
                        className="rounded-xl bg-ui-highlight px-4 py-2 text-sm font-semibold text-ui-action"
                      >
                        Save structured change
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowChangeCapture(false)}
                        className="rounded-xl bg-ui-night-raised px-4 py-2 text-sm font-semibold text-ui-action-text"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowChangeCapture(true)}
                    className="flex w-full items-center justify-center gap-2 min-h-11 rounded-xl px-4 py-3 text-base font-medium text-ui-night-muted transition-colors hover:bg-ui-night-raised hover:text-ui-night-text"
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ui-scrim px-4">
            <div className="w-full max-w-sm rounded-2xl bg-ui-surface-raised p-5 text-ui-action shadow-2xl">
              <h3 className="text-lg font-semibold">Exit cook-with-me?</h3>
              <p className="mt-2 text-sm leading-6 text-ui-muted">
                {ephemeral
                  ? "This is a practice cook — nothing is saved. Exit anyway?"
                  : "This session has not been saved as an attempt yet. Exit anyway?"}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingExit(false)}
                  className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-ui-surface-subtle px-4 text-sm font-semibold text-ui-text"
                >
                  Keep cooking
                </button>
                <button
                  type="button"
                  onClick={confirmExit}
                  className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-ui-accent px-4 text-sm font-semibold text-ui-action-text"
                >
                  Exit session
                </button>
              </div>
            </div>
          </div>
        )}

        {deduction && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ui-scrim sm:items-center">
            <div className="w-full max-w-md rounded-t-3xl bg-ui-surface-raised p-5 text-ui-action sm:rounded-2xl">
              <p className="text-xs font-semibold text-ui-accent">
                Shared inventory
              </p>
              <h3 className="mt-2 text-xl font-semibold">Update the household inventory?</h3>
              <p className="mt-1 text-xs leading-5 text-ui-muted">
                This meal is on the household plan. Confirm what you used — edit any amount first.
              </p>
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {deduction.items.map((item, index) => {
                  const draft = parseFloat(deductionDrafts[index] ?? "");
                  const overdraws =
                    item.onHand != null && Number.isFinite(draft) && draft > item.onHand;
                  return (
                    <div key={`${item.name}-${index}`} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ui-text">{item.name}</p>
                        <p className="text-[10px] text-ui-muted">
                          {item.onHand != null
                            ? `${item.onHand} ${item.unit} on hand`
                            : "not tracked in inventory"}
                          {overdraws && (
                            <span className="ml-1 font-semibold text-ui-warning-text">
                              · will dip below zero
                            </span>
                          )}
                        </p>
                      </div>
                      <input
                        type="number"
                        value={deductionDrafts[index] ?? ""}
                        onChange={(event) =>
                          setDeductionDrafts((d) => ({ ...d, [index]: event.target.value }))
                        }
                        inputMode="decimal"
                        aria-label={`Amount used of ${item.name}`}
                        className="w-24 rounded-xl border border-ui-border-strong bg-ui-surface-raised px-3 py-2.5 text-sm outline-none focus:border-ui-accent"
                      />
                      <span className="w-10 text-xs text-ui-muted">{item.unit}</span>
                    </div>
                  );
                })}
              </div>
              {deduction.notTracked.length > 0 && (
                <p className="mt-3 text-[11px] leading-4 text-ui-muted">
                  Not tracked: {deduction.notTracked.join(", ")}
                </p>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => finishDeduction(true)}
                  disabled={deducting}
                  className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-ui-accent px-4 text-sm font-semibold text-ui-action-text transition hover:bg-ui-accent disabled:opacity-50"
                >
                  {deducting ? "Updating..." : "Deduct from inventory"}
                </button>
                <button
                  type="button"
                  onClick={() => finishDeduction(false)}
                  disabled={deducting}
                  className="flex min-h-12 items-center justify-center rounded-xl border border-ui-border px-4 text-sm font-medium text-ui-muted"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="border-t border-ui-night-line bg-ui-action px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={!completed && stepIndex === 0}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-ui-night-raised px-5 text-sm font-semibold text-ui-action-text transition hover:bg-ui-night-line disabled:opacity-35"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {completed ? (
              <button
                type="button"
                onClick={saveSession}
                disabled={saving}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ui-highlight px-6 text-sm font-bold text-ui-action transition hover:bg-ui-highlight-hover disabled:opacity-60 sm:flex-none"
              >
                {saving ? "Saving..." : "Save session"}
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ui-highlight px-6 text-sm font-bold text-ui-action transition hover:bg-ui-highlight-hover sm:flex-none"
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
