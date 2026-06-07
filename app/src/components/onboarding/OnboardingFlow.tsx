"use client";

import { useMemo, useState } from "react";
import { Button } from "@radix-ui/themes";

type Goal = "learn" | "regular" | "family" | "plan" | "waste";
type Frequency = "daily" | "most_weekdays" | "weekly" | "occasional";
type CaptureMode = "voice" | "paste" | "url" | "scratch";

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

const frequencies: Array<{ value: Frequency; label: string }> = [
  { value: "most_weekdays", label: "3-4 times a week" },
  { value: "weekly", label: "Once a week" },
  { value: "daily", label: "Almost daily" },
  { value: "occasional", label: "When I can" },
];

const captureModes: Array<{ value: CaptureMode; title: string; body: string }> = [
  { value: "voice", title: "Record a conversation", body: "Best for asking family cooks how they really do it." },
  { value: "paste", title: "Paste notes", body: "Best for WhatsApp messages, rough lists, or old docs." },
  { value: "url", title: "Import a URL", body: "Best for recipes you want to adapt into your style." },
  { value: "scratch", title: "Start from scratch", body: "Best when you already know the recipe shape." },
];

export function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>(["family"]);
  const [frequency, setFrequency] = useState<Frequency>("most_weekdays");
  const [firstCaptureMode, setFirstCaptureMode] = useState<CaptureMode>("voice");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGoalSummary = useMemo(() => {
    const selected = goals.filter((item) => selectedGoals.includes(item.value));
    return selected.length > 0
      ? selected.map((item) => item.title).join(" + ")
      : "Your goals";
  }, [selectedGoals]);

  const toggleGoal = (nextGoal: Goal) => {
    setSelectedGoals((current) => {
      if (current.includes(nextGoal)) {
        return current.length === 1 ? current : current.filter((item) => item !== nextGoal);
      }
      return [...current, nextGoal];
    });
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
      window.localStorage.removeItem("mychelin_onboarding_pending");
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save onboarding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-5 text-[#1A1A1A] sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col rounded-[2rem] border border-[#ebe5dc] bg-[#fffdfb] shadow-[0_24px_80px_rgba(60,43,25,0.08)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#ebe5dc] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <img src="/images/mychelin-icon.png" alt="" className="h-9 w-9 object-contain" />
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

        <div className="grid flex-1 gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col justify-between border-b border-[#ebe5dc] px-5 py-6 sm:px-7 lg:border-b-0 lg:border-r">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#800020]">Welcome{userName ? ", " + userName.split(" ")[0] : ""}</p>
              <h1 className="app-editorial-title mt-4 max-w-md text-4xl leading-[1.02] text-[#1A1A1A] sm:text-5xl">
                Start with one small cooking promise.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-stone-600">
                Mychelin works best when it helps you reach one practical outcome first: capture a real family recipe, plan a meal, or cook more often.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-[#f0e5d8] bg-[#f8f3ec] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Your first loop</p>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                {selectedGoalSummary}: capture one recipe, cook one attempt, then improve it from what actually happened.
              </p>
            </div>
          </section>

          <section className="space-y-6 px-5 py-6 sm:px-7">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">What are your goals?</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
            </div>

            <div>
              <h2 className="text-sm font-semibold text-stone-900">How often do you want to cook at home?</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {frequencies.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFrequency(item.value)}
                    className={
                      "rounded-full border px-4 py-2 text-sm font-medium transition " +
                      (frequency === item.value
                        ? "border-[#17131f] bg-[#17131f] text-white"
                        : "border-[#ebe5dc] bg-white text-stone-600 hover:border-[#800020]/25 hover:text-stone-900")
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-stone-900">How do you want to capture your first recipe?</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {captureModes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFirstCaptureMode(item.value)}
                    className={
                      "rounded-2xl border px-4 py-3 text-left transition " +
                      (firstCaptureMode === item.value
                        ? "border-[#800020]/40 bg-[#800020]/5 shadow-sm"
                        : "border-[#ebe5dc] bg-white hover:border-[#800020]/20")
                    }
                  >
                    <span className="block text-sm font-semibold text-stone-900">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-500">{item.body}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                size="3"
                onClick={() => void save(false)}
                disabled={saving}
                className="!rounded-full !bg-[#17131f] !px-5 !font-semibold !text-white hover:!bg-[#800020]"
              >
                {saving ? "Saving..." : "Start Mychelin"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
