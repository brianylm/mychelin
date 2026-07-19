"use client";

import { useMemo, useState } from "react";
import { Button } from "@radix-ui/themes";
import { starterRecipes } from "@/lib/starter-recipes";

type Goal = "learn" | "regular" | "family" | "plan" | "waste";
type Frequency = "daily" | "most_weekdays" | "weekly" | "occasional";
type CaptureMode = "starter" | "voice" | "url" | "scratch";
type OnboardingStep = "goals" | "rhythm" | "capture";

interface OnboardingFlowProps {
  userName: string;
  onComplete: () => void;
}

const goals: Array<{ value: Goal; title: string; body: string }> = [
  { value: "family", title: "Save family recipes", body: "Turn memory, voice, and messy notes into recipes you can keep." },
  { value: "regular", title: "Cook regularly", body: "Build a steady home-cooking rhythm without deciding from scratch every day." },
  { value: "learn", title: "Learn how to cook", body: "Get guided steps, timers, and clearer technique as you build confidence." },
  { value: "plan", title: "Plan meals", body: "Know what to cook and what to buy before the week gets noisy." },
  { value: "waste", title: "Use what I have", body: "Reduce forgotten groceries and make fridge decisions easier." },
];

const frequencies: Array<{ value: Frequency; label: string; body: string }> = [
  { value: "most_weekdays", label: "3-4 times a week", body: "A steady weeknight rhythm." },
  { value: "weekly", label: "Once a week", body: "One reliable home-cooked meal." },
  { value: "daily", label: "Almost daily", body: "For an active home kitchen." },
  { value: "occasional", label: "When I can", body: "Keep it flexible and forgiving." },
];

const captureModes: Array<{ value: CaptureMode; title: string; body: string }> = [
  { value: "starter", title: "Start from a sample dish", body: "Copy a simple local recipe into your library and edit it as you cook." },
  { value: "voice", title: "Live recipe conversation", body: "Sit with a family cook while Mychelin captures the gist and suggests what to ask." },
  { value: "url", title: "Import from link", body: "Paste a recipe page, blog post, or video URL, with a Text fallback inside." },
  { value: "scratch", title: "Write or paste recipe", body: "Type naturally, paste OCR text, WhatsApp notes, or a rough memory dump." },
];

const steps: OnboardingStep[] = ["goals", "rhythm", "capture"];

export function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>(["family"]);
  const [frequency, setFrequency] = useState<Frequency>("most_weekdays");
  const [firstCaptureMode, setFirstCaptureMode] = useState<CaptureMode>("starter");
  const [selectedStarterSlug, setSelectedStarterSlug] = useState(starterRecipes[0]?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const selectedGoalSummary = useMemo(() => {
    const selected = goals.filter((item) => selectedGoals.includes(item.value));
    return selected.length > 0
      ? selected.map((item) => item.title).join(" + ")
      : "Your goals";
  }, [selectedGoals]);

  const stepTitle = step === "goals"
    ? "What do you want Mychelin to help with first?"
    : step === "rhythm"
      ? "How often do you want to cook at home?"
      : "How do you want to add your first recipe?";

  const stepBody = step === "goals"
    ? "Choose one or more. This helps Mychelin shape your first cooking loop."
    : step === "rhythm"
      ? "Set a realistic rhythm. This is a weekly promise, not a daily streak."
      : "Pick the starting point that matches what you already have.";

  const toggleGoal = (nextGoal: Goal) => {
    setSelectedGoals((current) => {
      if (current.includes(nextGoal)) {
        return current.length === 1 ? current : current.filter((item) => item !== nextGoal);
      }
      return [...current, nextGoal];
    });
  };

  const createStarterRecipe = async () => {
    const starter = starterRecipes.find((item) => item.slug === selectedStarterSlug);
    if (!starter || firstCaptureMode !== "starter") return;

    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: starter.title,
        status: "active",
        description: starter.description,
        cuisine: starter.cuisine,
        yield: starter.yield,
        prepTime: starter.prepTime,
        cookTime: starter.cookTime,
        ingredients: starter.ingredients,
        instructions: starter.instructions,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Failed to create starter recipe");
    }
  };

  const save = async (skip = false) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          skip
            ? { onboardingCompleted: true }
            : {
                onboardingCompleted: true,
                cookingGoal: JSON.stringify(selectedGoals),
                cookingFrequency: frequency,
                firstCaptureMode,
              }
        ),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save onboarding");
      }
      if (!skip) {
        await createStarterRecipe();
      }
      window.localStorage.removeItem("mychelin_onboarding_pending");
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save onboarding");
    } finally {
      setSaving(false);
    }
  };

  const continueFlow = () => {
    if (isLastStep) {
      void save(false);
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-5 text-[#1A1A1A] sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col rounded-[2rem] border border-[#ebe5dc] bg-[#fffdfb] shadow-[0_24px_80px_rgba(60,43,25,0.08)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#ebe5dc] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <img src="/images/mychelin-icon-96.webp" alt="" className="h-9 w-9 object-contain" />
            <div>
              <p className="logo-serif text-lg font-bold leading-none">
                <span className="text-[#800020]">my</span><span>chelin</span>
              </p>
              <p className="mt-1 text-xs text-stone-500">Set your home-cooking path</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void save(true)}
            disabled={saving}
            className="rounded-full px-3 py-2 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:opacity-60"
          >
            Skip
          </button>
        </div>

        <section className="flex flex-1 flex-col px-5 py-6 sm:px-7 sm:py-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#800020]">
              Welcome{userName ? ", " + userName.split(" ")[0] : ""}
            </p>
            <div className="mt-5 flex gap-2">
              {steps.map((item, index) => (
                <span
                  key={item}
                  className={
                    "h-1.5 flex-1 rounded-full transition " +
                    (index <= stepIndex ? "bg-[#800020]" : "bg-[#ece4d8]")
                  }
                />
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-stone-500">Step {stepIndex + 1} of {steps.length}</p>
            <h1 className="app-editorial-title mt-4 max-w-2xl text-4xl leading-[1.02] text-[#1A1A1A] sm:text-5xl">
              {stepTitle}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-stone-600">{stepBody}</p>
          </div>

          {step === "goals" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {goals.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleGoal(item.value)}
                  className={
                    "rounded-2xl border px-4 py-3 text-left transition " +
                    (selectedGoals.includes(item.value)
                      ? "border-[#800020]/40 bg-[#800020]/5 shadow-sm"
                      : "border-[#ebe5dc] bg-white hover:border-[#800020]/20")
                  }
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="block text-sm font-semibold text-stone-900">{item.title}</span>
                    <span className={"mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] " + (selectedGoals.includes(item.value) ? "border-[#800020] bg-[#800020] text-white" : "border-[#d8d8d2] text-transparent")}>✓</span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-stone-500">{item.body}</span>
                </button>
              ))}
            </div>
          )}

          {step === "rhythm" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {frequencies.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFrequency(item.value)}
                  className={
                    "rounded-2xl border px-4 py-4 text-left transition " +
                    (frequency === item.value
                      ? "border-[#17131f] bg-[#17131f] text-white shadow-sm"
                      : "border-[#ebe5dc] bg-white text-stone-700 hover:border-[#800020]/25")
                  }
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={"mt-1 block text-xs leading-5 " + (frequency === item.value ? "text-white/70" : "text-stone-500")}>{item.body}</span>
                </button>
              ))}
            </div>
          )}

          {step === "capture" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {captureModes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFirstCaptureMode(item.value)}
                  className={
                    "rounded-2xl border px-4 py-4 text-left transition " +
                    (firstCaptureMode === item.value
                      ? "border-[#800020]/40 bg-[#800020]/5 shadow-sm"
                      : "border-[#ebe5dc] bg-white hover:border-[#800020]/20")
                  }
                >
                  <span className="block text-sm font-semibold text-stone-900">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-stone-500">{item.body}</span>
                </button>
              ))}
              {firstCaptureMode === "starter" && (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Choose a starter recipe
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {starterRecipes.map((recipe) => (
                      <button
                        key={recipe.slug}
                        type="button"
                        onClick={() => setSelectedStarterSlug(recipe.slug)}
                        className={
                          "rounded-2xl border px-4 py-4 text-left transition " +
                          (selectedStarterSlug === recipe.slug
                            ? "border-[#17131f] bg-[#17131f] text-white shadow-sm"
                            : "border-[#ebe5dc] bg-white text-stone-700 hover:border-[#800020]/25")
                        }
                      >
                        <span className="block text-sm font-semibold">{recipe.title}</span>
                        <span className={"mt-1 block text-xs leading-5 " + (selectedStarterSlug === recipe.slug ? "text-white/70" : "text-stone-500")}>
                          {recipe.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-7 rounded-2xl border border-[#f0e5d8] bg-[#f8f3ec] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Your first loop</p>
            <p className="mt-3 text-sm leading-6 text-stone-700">
              {selectedGoalSummary}: capture one recipe, cook one attempt, then improve it from what actually happened.
            </p>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-7">
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={stepIndex === 0 || saving}
              className="rounded-full px-4 py-2 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:opacity-0"
            >
              Back
            </button>
            <Button
              type="button"
              size="3"
              onClick={continueFlow}
              disabled={saving}
              className="!rounded-full !bg-[#17131f] !px-5 !font-semibold !text-white hover:!bg-[#800020]"
            >
              {saving ? "Saving..." : isLastStep ? "Start Mychelin" : "Continue"}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
