"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { starterRecipes } from "@/lib/starter-recipes";

export type FirstCaptureMode = "starter" | "voice" | "url" | "paste";
export type OnboardingStart = FirstCaptureMode | null;

interface OnboardingFlowProps {
  userName: string;
  onComplete: (start: OnboardingStart) => void;
}

const startOptions: Array<{ value: FirstCaptureMode; title: string; body: string }> = [
  { value: "voice", title: "A dish my family makes", body: "Sit with the cook and capture it as they talk." },
  { value: "url", title: "A link", body: "Bring in a recipe page, blog post, or video." },
  { value: "paste", title: "Notes or a message", body: "Paste WhatsApp messages, rough lists, or old docs." },
  { value: "starter", title: "Nothing yet", body: "Start from a simple local dish and make it yours." },
];

function trackOnboarding(
  eventName: "onboarding_viewed" | "onboarding_option_picked" | "onboarding_skipped",
  option?: FirstCaptureMode
) {
  void fetch("/api/usage-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, ...(option ? { properties: { option } } : {}) }),
  }).catch(() => {
    /* analytics are best-effort */
  });
}

export function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
  const [pickingStarter, setPickingStarter] = useState(false);
  const [selectedStarterSlug, setSelectedStarterSlug] = useState(starterRecipes[0]?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Survives a failed preferences save, so a retry cannot copy the dish twice.
  const starterCreatedRef = useRef(false);

  useEffect(() => {
    trackOnboarding("onboarding_viewed");
  }, []);

  const createStarterRecipe = async () => {
    const starter = starterRecipes.find((item) => item.slug === selectedStarterSlug);
    if (!starter) throw new Error("Choose a dish to start from");

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
      throw new Error(body.error || "Could not add that dish. Try again.");
    }
  };

  const finish = async (start: OnboardingStart) => {
    setSaving(true);
    setError(null);
    try {
      // The recipe comes first: onboarding must never be marked done while
      // the dish the user picked is missing.
      if (start === "starter" && !starterCreatedRef.current) {
        await createStarterRecipe();
        starterCreatedRef.current = true;
      }

      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          start ? { onboardingCompleted: true, firstCaptureMode: start } : { onboardingCompleted: true }
        ),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not save that. Try again.");
      }

      if (start) trackOnboarding("onboarding_option_picked", start);
      else trackOnboarding("onboarding_skipped");
      window.localStorage.removeItem("mychelin_onboarding_pending");
      onComplete(start);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const pick = (option: FirstCaptureMode) => {
    if (option === "starter") {
      setError(null);
      setPickingStarter(true);
      return;
    }
    void finish(option);
  };

  const firstName = userName ? userName.split(" ")[0] : "";

  return (
    <main className="min-h-screen bg-ui-bg px-4 py-5 text-ui-text sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-xl flex-col">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/mychelin-icon-96.webp" alt="" className="h-9 w-9 object-contain" />
            <p className="logo-serif text-lg font-bold leading-none">
              <span className="text-ui-accent">my</span><span>chelin</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void finish(null)}
            disabled={saving}
            className="min-h-11 rounded-full px-3 text-sm font-semibold text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text disabled:opacity-60"
          >
            Skip
          </button>
        </div>

        {pickingStarter ? (
          <section className="flex flex-1 flex-col pt-8">
            <h1 className="app-editorial-title text-3xl leading-tight text-ui-text sm:text-4xl">
              Pick a dish to start with
            </h1>
            <p className="mt-3 text-sm leading-6 text-ui-muted">
              We&rsquo;ll add it to your library, then cook it with you.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              {starterRecipes.map((recipe) => {
                const selected = selectedStarterSlug === recipe.slug;
                return (
                  <button
                    key={recipe.slug}
                    type="button"
                    onClick={() => setSelectedStarterSlug(recipe.slug)}
                    aria-pressed={selected}
                    className={
                      "rounded-2xl border px-4 py-3 text-left transition-colors " +
                      (selected
                        ? "border-ui-accent bg-ui-accent/5"
                        : "border-ui-border bg-ui-surface hover:border-ui-accent/40")
                    }
                  >
                    <span className="block text-sm font-semibold text-ui-text">{recipe.title}</span>
                    <span className="mt-0.5 block text-sm leading-5 text-ui-muted">{recipe.subtitle}</span>
                  </button>
                );
              })}
            </div>

            {error && <p role="alert" className="mt-4 text-sm text-ui-danger">{error}</p>}

            <div className="mt-auto flex items-center justify-between gap-3 pt-7">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPickingStarter(false);
                }}
                disabled={saving}
                className="min-h-11 rounded-full px-4 text-sm font-semibold text-ui-muted transition-colors hover:bg-ui-surface-subtle hover:text-ui-text"
              >
                Back
              </button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => void finish("starter")}
                disabled={saving}
                className="!rounded-full !px-5 !font-semibold"
              >
                {saving ? "Adding..." : "Use this dish"}
              </Button>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col pt-8">
            <p className="text-sm font-semibold text-ui-accent">
              Welcome{firstName ? ", " + firstName : ""}
            </p>
            <h1 className="app-editorial-title mt-2 text-3xl leading-tight text-ui-text sm:text-4xl">
              What do you have to start with?
            </h1>

            <div className="mt-5 rounded-2xl bg-ui-surface-subtle p-4">
              <p className="text-sm leading-6 text-ui-muted">
                &ldquo;Ah Ma&rsquo;s chap chye: soak mushrooms first, one big spoon taucheo, agak agak the water, cook till cabbage soft&rdquo;
              </p>
              <p className="mt-3 text-sm font-semibold text-ui-text">Mychelin turns it into a recipe you can cook</p>
              <p className="mt-1 text-sm leading-6 text-ui-muted">
                Chap chye. Soak the mushrooms, fry the taucheo, add cabbage and water, simmer until soft.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {startOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => pick(option.value)}
                  disabled={saving}
                  className="rounded-2xl border border-ui-border bg-ui-surface px-4 py-3 text-left transition-colors hover:border-ui-accent/40 disabled:opacity-60"
                >
                  <span className="block text-sm font-semibold text-ui-text">{option.title}</span>
                  <span className="mt-0.5 block text-sm leading-5 text-ui-muted">{option.body}</span>
                </button>
              ))}
            </div>

            {error && <p role="alert" className="mt-4 text-sm text-ui-danger">{error}</p>}
          </section>
        )}
      </div>
    </main>
  );
}
