"use client";

import { useEffect, useState } from "react";
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
  onStartCook: (recipeId: number, recipeTitle: string) => void;
  onOpenPlanner: () => void;
  onOpenShopping: () => void;
  onOpenCreate: () => void;
  onOpenRecipe: (recipeId: number) => void;
  onDone: () => void;
}

const STEP_LABELS = ["Pick a dish", "Plan it", "What to buy", "Cook with Me"];

const RECIPE_KEY = "mychelin:first-cook-recipe-id";

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

  const rememberPick = (id: number) => {
    setSelectedId(id);
    try {
      window.localStorage.setItem(RECIPE_KEY, String(id));
    } catch {
      /* private mode — pick just doesn't persist */
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
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
            <Check className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="logo-serif mt-5 text-2xl font-bold leading-tight text-[var(--ui-text)]">
            Nice one{recipeTitle ? ` — ${recipeTitle}` : ""}.
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--ui-muted)]">
            You cooked it and recorded how it went. That&rsquo;s your rhythm moving —{" "}
            <span className="font-semibold text-[var(--ui-text)]">
              {cookedThisWeek} of {goal} meal{goal === 1 ? "" : "s"} this week
            </span>
            .
          </p>
          <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
            {recipeId != null && (
              <button
                type="button"
                onClick={() => onOpenRecipe(recipeId)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ui-action)] px-4 text-sm font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)]"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Save what changed as a version
              </button>
            )}
            <button
              type="button"
              onClick={onOpenPlanner}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-4 text-sm font-semibold text-[var(--ui-accent)] transition-colors hover:bg-[var(--ui-surface-subtle)]"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Plan your next meal
            </button>
            <button
              type="button"
              onClick={onDone}
              className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
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
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--ui-action)] px-5 text-sm font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)] disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    ) : step === 1 ? (
      <div className="flex w-full items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(0)}
          className="inline-flex min-h-10 items-center justify-center rounded-full px-3 text-sm font-semibold text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={onOpenPlanner}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--ui-action)] px-5 text-sm font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)]"
          >
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            Plan it in my week
          </button>
        </div>
      </div>
    ) : step === 2 ? (
      <div className="flex w-full items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="inline-flex min-h-10 items-center justify-center rounded-full px-3 text-sm font-semibold text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={onOpenShopping}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--ui-action)] px-5 text-sm font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)]"
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
          className="inline-flex min-h-10 items-center justify-center rounded-full px-3 text-sm font-semibold text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => selected && onStartCook(selected.id, selected.title)}
          disabled={!selected}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--ui-action)] px-6 text-sm font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)] disabled:opacity-50"
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
          {step === 0 && <ChefHat className="h-5 w-5 text-[#800020]" aria-hidden="true" />}
          {step === 1 && <CalendarClock className="h-5 w-5 text-[#800020]" aria-hidden="true" />}
          {step === 2 && <ShoppingCart className="h-5 w-5 text-[#800020]" aria-hidden="true" />}
          {step === 3 && <Play className="h-5 w-5 text-[#800020]" aria-hidden="true" />}
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
              (index <= step ? "bg-[#800020]" : "bg-[var(--ui-border)]")
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
              <p className="text-sm font-semibold text-[var(--ui-text)]">No recipe yet</p>
              <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--ui-muted)]">
                Add your first recipe and come back — the mission will be right here waiting.
              </p>
              <button
                type="button"
                onClick={onOpenCreate}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--ui-action)] px-5 text-sm font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)]"
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
                        ? "border-[#800020]/40 bg-[#800020]/5 shadow-sm"
                        : "border-[var(--ui-border)] bg-white hover:border-[#800020]/20")
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--ui-text)]">
                        {recipe.title}
                      </span>
                      {recipe.cuisine && (
                        <span className="mt-0.5 block truncate text-xs text-[var(--ui-muted)]">
                          {recipe.cuisine}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] " +
                        (isSelected
                          ? "border-[#800020] bg-[#800020] text-white"
                          : "border-[var(--ui-border-strong)] text-transparent")
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
          <p className="text-sm leading-6 text-[var(--ui-text)]">
            Add <span className="font-semibold">{selected?.title ?? "this dish"}</span> to a week
            slot so Mychelin knows what to cook and what to buy.
          </p>
          <p className="mt-3 text-xs leading-5 text-[var(--ui-muted)]">
            You can skip this and go straight to cooking — the planner stays available whenever
            you&rsquo;re ready.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="min-h-[16rem]">
          <p className="text-sm leading-6 text-[var(--ui-text)]">
            Generate a shopping list for <span className="font-semibold">{selected?.title ?? "this dish"}</span>{" "}
            so you have everything before you start.
          </p>
          <p className="mt-3 text-xs leading-5 text-[var(--ui-muted)]">
            Skipping is fine — you can cook straight away and grab anything missing on the way.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="min-h-[16rem]">
          <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-subtle)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#800020]">
              Tonight&rsquo;s dish
            </p>
            <p className="logo-serif mt-2 text-2xl font-bold leading-tight text-[var(--ui-text)]">
              {selected?.title}
            </p>
            {selected?.cuisine && (
              <p className="mt-1 text-xs text-[var(--ui-muted)]">{selected.cuisine}</p>
            )}
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--ui-text)]">
            Cook With Me walks you through each step, times it, and nudges you on heat. When you
            finish, record how it went — that&rsquo;s your first attempt.
          </p>
        </div>
      )}
    </Dialog>
  );
}
