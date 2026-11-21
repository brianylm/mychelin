"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  ChefHat,
  Play,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { buildMissionSlots, firstFreeSlotDate, type MissionSlot } from "@/lib/mission-slots";

interface MissionRecipe {
  id: number;
  title: string;
  cuisine: string | null;
}

interface FirstCookMissionFlowProps {
  // "flow" = the guided stepper; "completion" = the celebrate screen shown
  // after the first Cook With Me session finishes.
  phase: "flow" | "completion";
  recipeTitle?: string | null;
  recipeId?: number | null;
  onClose: () => void;
  onStartCook: (recipeId: number, recipeTitle: string, mealPlanId?: number) => void;
  onOpenPlanner: () => void;
  onOpenShopping: () => void;
  onOpenCreate: () => void;
  onOpenRecipe: (recipeId: number) => void;
  onDone: () => void;
}

const STEP_LABELS = ["Pick a dish", "Plan it", "What to buy", "Cook with Me"];
const GOAL_CHOICES = [1, 2, 3, 4, 5];

const RECIPE_KEY = "mychelin:first-cook-recipe-id";
// Wizard progress, so coming back from the shopping handoff resumes in place.
const PROGRESS_KEY = "mychelin:first-cook-progress";

interface MissionProgress {
  step: number;
  recipeId: number;
  mealPlanId: number | null;
}

function readProgress(): MissionProgress | null {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MissionProgress>;
    if (
      typeof parsed.step === "number" &&
      parsed.step >= 1 &&
      parsed.step <= 3 &&
      typeof parsed.recipeId === "number"
    ) {
      return {
        step: parsed.step,
        recipeId: parsed.recipeId,
        mealPlanId: typeof parsed.mealPlanId === "number" ? parsed.mealPlanId : null,
      };
    }
  } catch {
    /* private mode or corrupt value — start from the top */
  }
  return null;
}

function writeProgress(progress: MissionProgress | null) {
  try {
    if (progress) window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    else window.localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* private mode — progress just doesn't persist */
  }
}

// Guides a first-time cook from an existing recipe through the loop:
// pick → optional plan → optional shopping → Cook With Me. Cooking and the
// attempt happen in the existing CookWithMeSession; this flow is the
// guidance wrapper around existing surfaces. The completion screen surfaces
// the weekly rhythm from /api/notifications/rhythm — no new tracking.
export function FirstCookMissionFlow({
  phase,
  recipeTitle,
  recipeId,
  onClose,
  onStartCook,
  onOpenPlanner,
  onOpenShopping,
  onOpenCreate,
  onOpenRecipe,
  onDone,
}: FirstCookMissionFlowProps) {
  const [step, setStep] = useState(0);
  const [recipes, setRecipes] = useState<MissionRecipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [goal, setGoal] = useState(2);
  const [cookedThisWeek, setCookedThisWeek] = useState(1);
  const [mealPlanId, setMealPlanId] = useState<number | null>(null);
  const [slots, setSlots] = useState<MissionSlot[] | null>(null);
  const [slotDate, setSlotDate] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // Load the user's recipes for the picker when the flow opens.
  useEffect(() => {
    if (phase !== "flow") return;
    let cancelled = false;
    fetch("/api/recipes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;
        const list: MissionRecipe[] = Array.isArray(data)
          ? data
              .filter((recipe: { status?: string }) => recipe.status === "active")
              .map((recipe: { id: number; title: string; cuisine: string | null }) => ({
                id: recipe.id,
                title: recipe.title,
                cuisine: recipe.cuisine ?? null,
              }))
          : [];
        setRecipes(list);
        setRecipesLoading(false);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readProgress();
          if (saved && list.some((recipe) => recipe.id === saved.recipeId)) {
            setSelectedId(saved.recipeId);
            setMealPlanId(saved.mealPlanId);
            setStep(saved.step);
            return;
          }
        }
        setSelectedId((prev) => {
          if (prev != null && list.some((recipe) => recipe.id === prev)) return prev;
          try {
            const remembered = Number(window.localStorage.getItem(RECIPE_KEY));
            if (Number.isFinite(remembered) && list.some((recipe) => recipe.id === remembered)) {
              return remembered;
            }
          } catch {
            /* private mode — no persisted pick */
          }
          return list[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) setRecipesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // Persist progress once past the recipe pick.
  useEffect(() => {
    if (phase !== "flow" || !restoredRef.current) return;
    if (step >= 1 && selectedId != null) {
      writeProgress({ step, recipeId: selectedId, mealPlanId });
    } else if (step === 0) {
      writeProgress(null);
    }
  }, [phase, step, selectedId, mealPlanId]);

  // Completion means the loop is done — the next mission starts fresh.
  useEffect(() => {
    if (phase === "completion") writeProgress(null);
  }, [phase]);

  // Load tonight and tomorrow's dinner slots when the plan step opens.
  useEffect(() => {
    if (phase !== "flow" || step !== 1 || slots) return;
    let cancelled = false;
    const now = new Date();
    const range = buildMissionSlots([], [], now);
    fetch(`/api/meal-plans?startDate=${range[0].date}&endDate=${range[1].date}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const plans = Array.isArray(data?.plans) ? data.plans : [];
        const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
        const memberBlocks = Array.isArray(data?.memberBlocks) ? data.memberBlocks : [];
        const next = buildMissionSlots(plans, [...blocks, ...memberBlocks], now);
        setSlots(next);
        setSlotDate(firstFreeSlotDate(next));
      })
      .catch(() => {
        if (cancelled) return;
        // Offer both slots; the server still validates on confirm.
        const next = buildMissionSlots([], [], now);
        setSlots(next);
        setSlotDate(next[0].date);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, step, slots]);

  // Load live rhythm numbers for the completion screen.
  useEffect(() => {
    if (phase !== "completion") return;
    let cancelled = false;
    fetch("/api/notifications/rhythm")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (Number.isFinite(data.weeklyCookingGoal)) setGoal(data.weeklyCookingGoal);
        if (Number.isFinite(data.cookedThisWeek)) setCookedThisWeek(data.cookedThisWeek);
      })
      .catch(() => {
        /* best-effort — numbers already default */
      });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  const chooseGoal = (next: number) => {
    setGoal(next);
    fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyCookingGoal: next }),
    }).catch(() => {
      /* best-effort — it can still be changed in Profile */
    });
  };

  const rememberPick = (id: number) => {
    setSelectedId(id);
    try {
      window.localStorage.setItem(RECIPE_KEY, String(id));
    } catch {
      /* private mode — pick just doesn't persist */
    }
  };

  const confirmPlan = async () => {
    if (!slotDate || selectedId == null) return;
    setPlanning(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: slotDate,
          mealType: "dinner",
          recipeId: selectedId,
          servings: 1,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlanError(body.error || "Couldn't add it to your plan");
        return;
      }
      setMealPlanId(typeof body.id === "number" ? body.id : null);
      setStep(2);
    } catch {
      setPlanError("Couldn't add it to your plan");
    } finally {
      setPlanning(false);
    }
  };

  // ── Completion screen ────────────────────────────────────
  if (phase === "completion") {
    return (
      <Dialog
        open
        onClose={onClose}
        title="First cook recorded"
        subtitle="That's the whole loop: capture, plan, cook, and improve."
        hideCloseButton
      >
        <div className="flex flex-col items-center px-2 pb-4 pt-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ui-accent-muted text-ui-accent">
            <Check className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="logo-serif mt-5 text-2xl font-bold leading-tight text-ui-text">
            Nice one{recipeTitle ? ` — ${recipeTitle}` : ""}.
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ui-muted">
            You cooked it and recorded how it went. That&rsquo;s your rhythm moving —{" "}
            <span className="font-semibold text-ui-text">
              {cookedThisWeek} of {goal} meal{goal === 1 ? "" : "s"} this week
            </span>
            .
          </p>
          <div className="mt-6 w-full max-w-xs">
            <p className="text-sm font-semibold text-ui-text">How many meals a week feels realistic?</p>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {GOAL_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => chooseGoal(choice)}
                  aria-pressed={goal === choice}
                  aria-label={`${choice} meal${choice === 1 ? "" : "s"} a week`}
                  className={
                    "min-h-11 rounded-xl border text-sm font-semibold transition-colors " +
                    (goal === choice
                      ? "border-ui-action bg-ui-action text-ui-action-text"
                      : "border-ui-border bg-ui-surface-raised text-ui-text hover:border-ui-border-strong")
                  }
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
            {recipeId != null && (
              <button
                type="button"
                onClick={() => onOpenRecipe(recipeId)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ui-action px-4 text-sm font-semibold text-ui-action-text transition-colors hover:bg-ui-action-hover"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Save what changed as a version
              </button>
            )}
            <button
              type="button"
              onClick={onOpenPlanner}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ui-border-strong bg-ui-surface-raised px-4 text-sm font-semibold text-ui-accent transition-colors hover:bg-ui-surface-subtle"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Plan your next meal
            </button>
            <button
              type="button"
              onClick={onDone}
              className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
            >
              Done
            </button>
          </div>
        </div>
      </Dialog>
    );
  }

  // ── Guided stepper ───────────────────────────────────────
  const selected = recipes.find((recipe) => recipe.id === selectedId) ?? null;

  const footer =
    step === 0 ? (
      <div className="flex w-full items-center justify-between gap-3">
        <span />
        <button
          type="button"
          onClick={() => {
            if (selected) rememberPick(selected.id);
            setStep(1);
          }}
          disabled={!selected || recipesLoading}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-ui-action px-5 text-sm font-semibold text-ui-action-text transition-colors hover:bg-ui-action-hover disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    ) : step === 1 ? (
      <div className="flex w-full items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(0)}
          className="inline-flex min-h-10 items-center justify-center rounded-full px-3 text-sm font-semibold text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={confirmPlan}
            disabled={!slotDate || planning}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-ui-action px-5 text-sm font-semibold text-ui-action-text transition-colors hover:bg-ui-action-hover disabled:opacity-50"
          >
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {planning ? "Adding…" : "Plan it in my week"}
          </button>
        </div>
      </div>
    ) : step === 2 ? (
      <div className="flex w-full items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="inline-flex min-h-10 items-center justify-center rounded-full px-3 text-sm font-semibold text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={onOpenShopping}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-ui-action px-5 text-sm font-semibold text-ui-action-text transition-colors hover:bg-ui-action-hover"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Open shopping list
          </button>
        </div>
      </div>
    ) : (
      <div className="flex w-full items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="inline-flex min-h-10 items-center justify-center rounded-full px-3 text-sm font-semibold text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (!selected) return;
            writeProgress(null);
            onStartCook(selected.id, selected.title, mealPlanId ?? undefined);
          }}
          disabled={!selected}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-ui-action px-6 text-sm font-semibold text-ui-action-text transition-colors hover:bg-ui-action-hover disabled:opacity-50"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          Start cooking
        </button>
      </div>
    );

  return (
    <Dialog
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {step === 0 && <ChefHat className="h-5 w-5 text-ui-accent" aria-hidden="true" />}
          {step === 1 && <CalendarClock className="h-5 w-5 text-ui-accent" aria-hidden="true" />}
          {step === 2 && <ShoppingCart className="h-5 w-5 text-ui-accent" aria-hidden="true" />}
          {step === 3 && <Play className="h-5 w-5 text-ui-accent" aria-hidden="true" />}
          {STEP_LABELS[step]}
        </span>
      }
      subtitle={
        step === 0
          ? "Choose the dish for your first cook-along."
          : step === 1
            ? "Optional — you can go straight to cooking."
            : step === 2
              ? "Optional — you can cook without the list."
              : "Mychelin guides you step by step with timers and heat cues."
      }
      footer={footer}
    >
      {/* Step progress */}
      <div className="mb-5 flex gap-1.5 px-0.5">
        {STEP_LABELS.map((_, index) => (
          <span
            key={index}
            className={
              "h-1.5 flex-1 rounded-full transition " +
              (index <= step ? "bg-ui-accent" : "bg-ui-border")
            }
          />
        ))}
      </div>

      {step === 0 && (
        <div className="min-h-[16rem]">
          {recipesLoading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingAnimation />
            </div>
          ) : recipes.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-ui-text">No recipe yet</p>
              <p className="mt-2 max-w-xs text-xs leading-5 text-ui-muted">
                Add your first recipe and come back — the mission will be right here waiting.
              </p>
              <button
                type="button"
                onClick={onOpenCreate}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-ui-action px-5 text-sm font-semibold text-ui-action-text transition-colors hover:bg-ui-action-hover"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add a recipe
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recipes.map((recipe) => {
                const isSelected = recipe.id === selectedId;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => rememberPick(recipe.id)}
                    aria-pressed={isSelected}
                    className={
                      "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition " +
                      (isSelected
                        ? "border-ui-accent bg-ui-accent-muted shadow-sm"
                        : "border-ui-border bg-ui-surface-raised hover:border-ui-border-strong")
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ui-text">
                        {recipe.title}
                      </span>
                      {recipe.cuisine && (
                        <span className="mt-0.5 block truncate text-xs text-ui-muted">
                          {recipe.cuisine}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] " +
                        (isSelected
                          ? "border-ui-accent bg-ui-accent text-ui-action-text"
                          : "border-ui-border-strong text-transparent")
                      }
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="min-h-[16rem]">
          <p className="text-sm leading-6 text-ui-text">
            Add <span className="font-semibold">{selected?.title ?? "this dish"}</span> to a week
            slot so Mychelin knows what to cook and what to buy.
          </p>
          <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Dinner slot">
            {slots === null ? (
              <div className="flex h-24 items-center justify-center">
                <LoadingAnimation />
              </div>
            ) : (
              slots.map((slot) => {
                const isSelected = slot.date === slotDate;
                return (
                  <button
                    key={slot.date}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={slot.taken}
                    onClick={() => {
                      setSlotDate(slot.date);
                      setPlanError(null);
                    }}
                    className={
                      "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition disabled:opacity-60 " +
                      (isSelected
                        ? "border-ui-accent bg-ui-accent-muted shadow-sm"
                        : "border-ui-border bg-ui-surface-raised hover:border-ui-border-strong")
                    }
                  >
                    <span className="text-sm font-semibold text-ui-text">{slot.label}</span>
                    {slot.taken && <span className="text-xs text-ui-muted">Already taken</span>}
                  </button>
                );
              })
            )}
          </div>
          {slots !== null && !slotDate && (
            <p className="mt-3 text-xs leading-5 text-ui-muted">
              Both dinners are taken. Skip this, or pick another day in the full planner.
            </p>
          )}
          {planError && (
            <p role="alert" className="mt-3 text-xs leading-5 text-ui-danger">
              {planError}
            </p>
          )}
          <button
            type="button"
            onClick={onOpenPlanner}
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-ui-accent underline-offset-2 hover:underline"
          >
            Open full planner
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="min-h-[16rem]">
          <p className="text-sm leading-6 text-ui-text">
            Generate a shopping list for <span className="font-semibold">{selected?.title ?? "this dish"}</span>{" "}
            so you have everything before you start.
          </p>
          <p className="mt-3 text-xs leading-5 text-ui-muted">
            Skipping is fine — you can cook straight away and grab anything missing on the way.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="min-h-[16rem]">
          <div className="rounded-2xl border border-ui-border bg-ui-surface-subtle p-4">
            <p className="text-xs font-semibold text-ui-accent">
              Tonight&rsquo;s dish
            </p>
            <p className="logo-serif mt-2 text-2xl font-bold leading-tight text-ui-text">
              {selected?.title}
            </p>
            {selected?.cuisine && (
              <p className="mt-1 text-xs text-ui-muted">{selected.cuisine}</p>
            )}
          </div>
          <p className="mt-4 text-sm leading-6 text-ui-text">
            Cook With Me walks you through each step, times it, and nudges you on heat. When you
            finish, record how it went — that&rsquo;s your first attempt.
          </p>
        </div>
      )}
    </Dialog>
  );
}
