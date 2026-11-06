"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ServingScaler, formatScaledQuantity } from "@/components/recipes/ServingScaler";
import { SignupNudge } from "@/components/sharing/SignupNudge";
import { SharedRecipeCard } from "@/components/sharing/SharedRecipeCard";
import { SHARED_RECIPE_CARD_ENABLED } from "@/lib/feature-flags";
import type { SharedRecipeDTO } from "@/lib/shared-recipe";

type SharedRecipe = SharedRecipeDTO;

interface SharedBook {
  id: number;
  title: string;
  description: string | null;
  coverEmoji: string;
  coverColor: string;
  recipes: { id: number; title: string; cuisine: string | null; imageUrl: string | null; description: string | null }[];
}

type SharedData =
  | { type: "recipe"; permission: string; data: SharedRecipe }
  | { type: "book"; permission: string; data: SharedBook };

// ─── Save to Mychelin button (logged-in users) ────────────
function SaveRecipeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedId, setSavedId] = useState<number | null>(null);

  const handleSave = async () => {
    setState("saving");
    try {
      const res = await fetch(`/api/share/${token}/save`, { method: "POST" });
      if (res.status === 409) {
        setState("saved");
        return;
      }
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setSavedId(data.id);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  if (state === "saved") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ui-border bg-ui-success-soft px-4 py-3 shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="text-xl">✓</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ui-success">Saved to your Mychelin!</p>
            <p className="text-[11px] text-ui-success">This recipe is now in your collection.</p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-full bg-ui-success px-4 py-2 text-xs font-semibold text-ui-action-text shadow-sm transition-colors hover:bg-ui-success"
          >
            Open my recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ui-border bg-ui-surface-raised px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <span className="hidden text-2xl sm:inline">📖</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ui-text">
            Like this recipe?
          </p>
          <p className="text-[11px] text-ui-muted truncate">
            Save it to your collection and make it your own.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={state === "saving"}
          className="shrink-0 rounded-xl bg-ui-action px-4 py-2 text-xs font-semibold text-ui-action-text shadow-sm transition-colors hover:bg-ui-accent disabled:opacity-60 min-h-11"
        >
          {state === "saving" ? "Saving…" : "Save to my Mychelin"}
        </button>
        {state === "error" && (
          <span className="text-[10px] text-ui-danger">Failed — try again</span>
        )}
      </div>
    </div>
  );
}

// ─── Recipe detail view ────────────────────────────────────
function RecipeDetail({ recipe, permission, onBack }: { recipe: SharedRecipe; permission: string; onBack?: () => void }) {
  const r = recipe;
  const [scale, setScale] = useState(1);
  return (
    <div className="min-h-screen bg-ui-surface-subtle pb-24">
      <header className="sticky top-0 z-10 border-b border-ui-border bg-ui-surface-raised">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted hover:bg-ui-surface-subtle"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <img src="/icons/icon-96.png" alt="Mychelin" className="h-8 w-8 rounded-lg" />
          )}
          <span className="text-sm font-semibold text-ui-text truncate flex-1">
            {onBack ? r.title : "Mychelin"}
          </span>
          <span className="ml-auto text-xs text-ui-muted shrink-0">
            {permission === "edit" ? "Collaborator" : "View only"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {/* Cover image */}
        {r.imageUrl && (
          <div className="mb-6 overflow-hidden rounded-2xl">
            <img src={r.imageUrl} alt={r.title} className="w-full h-56 object-cover" />
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-ui-text">{r.title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {r.cuisine && (
            <span className="inline-block text-sm text-ui-muted">
              {r.cuisine}
            </span>
          )}
          <span className="inline-block text-sm text-ui-success">
            Definitive version{r.definitiveVersionLabel ? " " + r.definitiveVersionLabel : ""}
          </span>
        </div>
        {r.description && (
          <p className="mt-3 text-sm text-ui-muted leading-relaxed">{r.description}</p>
        )}

        {/* Source URL attribution */}
        {r.sourceUrl && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-ui-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>Imported from{" "}
              <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:text-ui-info">
                {(() => { try { return new URL(r.sourceUrl).hostname.replace(/^www\./, ""); } catch { return r.sourceUrl; } })()}
              </a>
            </span>
          </div>
        )}

        {/* Times */}
        {(r.prepTime || r.cookTime) && (
          <div className="mt-4 flex gap-4 text-sm text-ui-muted">
            {r.prepTime && <span>🔪 {r.prepTime}m prep</span>}
            {r.cookTime && <span>🔥 {r.cookTime}m cook</span>}
          </div>
        )}

        {/* Story */}
        {r.story && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-ui-text">Family Story</h3>
            <p className="text-sm text-ui-text leading-relaxed whitespace-pre-wrap">{r.story}</p>
          </div>
        )}

        {/* Cultural context */}
        {(r.origin || r.dialect || r.occasion || r.familyMember) && (
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
            {r.origin && <span className="text-sm text-ui-muted">📍 {r.origin}</span>}
            {r.dialect && <span className="text-sm text-ui-muted">🗣 {r.dialect}</span>}
            {r.occasion && <span className="text-sm text-ui-muted">🎉 {r.occasion}</span>}
            {r.familyMember && <span className="text-sm text-ui-muted">👨‍👩‍👧 {r.familyMember}</span>}
          </div>
        )}

        {/* Serving Scaler */}
        {r.yield && (
          <div className="mt-8">
            <ServingScaler baseYield={r.yield} onScaleChange={setScale} />
          </div>
        )}

        {/* Ingredients */}
        {r.ingredients.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-3 text-lg font-semibold text-ui-text">Ingredients</h2>
            <ul className="space-y-2">
              {r.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-ui-accent" />
                  <div>
                    <span className="font-medium text-ui-text">{ing.name}</span>
                    {(ing.quantityText || ing.quantity || ing.unit) && (
                      <span className={`ml-2 text-sm ${scale !== 1 && !ing.quantityText ? "text-ui-accent font-medium" : "text-ui-muted"}`}>
                        {ing.quantityText || (ing.quantity ? formatScaledQuantity(ing.quantity, scale) : "")}{!ing.quantityText && ing.unit ? ` ${ing.unit}` : ""}
                      </span>
                    )}
                    {ing.notes && <p className="mt-0.5 text-xs text-ui-muted">{ing.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {r.instructions.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-ui-text">Steps</h2>
            <ol className="space-y-4">
              {r.instructions.map((step) => (
                <li key={step.stepNumber} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ui-accent-muted text-xs font-bold text-ui-accent">
                    {step.stepNumber}
                  </span>
                  <div>
                    <p className="text-sm text-ui-text leading-relaxed">{step.content}</p>
                    {step.tip && (
                      <p className="mt-1 text-xs text-ui-accent">💡 {step.tip}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Photos */}
        {r.photos.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-ui-text">Photos</h2>
            <div className="grid grid-cols-2 gap-3">
              {r.photos.map((p, i) => (
                <img key={i} src={p.blobUrl} alt="" className="rounded-xl object-cover h-40 w-full" />
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 pb-8 text-center text-xs text-ui-muted">
          Made with <Link href="/" className="text-ui-accent hover:underline">Mychelin</Link> · cooking like home, even in your new home
        </div>
      </div>
    </div>
  );
}

// ─── Main page component ───────────────────────────────────
export default function SharedPage() {
  const params = useParams();
  const token = params.token as string;
  const [shared, setShared] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<SharedRecipe | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setShared)
      .catch(() => setError("This share link is invalid or has been removed."))
      .finally(() => setLoading(false));

    // Lightweight auth check — don't block rendering
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, [token]);

  const openRecipe = useCallback(async (recipeId: number) => {
    setLoadingRecipe(true);
    try {
      const res = await fetch(`/api/share/${token}?recipeId=${recipeId}`);
      if (!res.ok) throw new Error("Failed to load recipe");
      const data = await res.json();
      setSelectedRecipe(data.data);
    } catch {
      // fallback — just stay on book view
    } finally {
      setLoadingRecipe(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ui-surface-subtle">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !shared) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ui-surface-subtle px-6 text-center">
        <span className="mb-4 text-5xl">🔗</span>
        <h1 className="text-xl font-semibold text-ui-text">Link not found</h1>
        <p className="mt-2 text-sm text-ui-muted">{error}</p>
      </div>
    );
  }

  // Recipe detail view (either direct recipe share or drilled-in from book)
  if (shared.type === "recipe" || selectedRecipe) {
    const recipe = selectedRecipe || (shared.type === "recipe" ? shared.data : null);
    if (!recipe) return null;

    if (SHARED_RECIPE_CARD_ENABLED && !selectedRecipe) {
      return (
        <div className="min-h-screen bg-ui-surface-subtle pb-24">
          <header className="sticky top-0 z-10 border-b border-ui-border bg-ui-surface-raised">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
              <img src="/icons/icon-96.png" alt="Mychelin" className="h-8 w-8 rounded-lg" />
              <span className="text-sm font-semibold text-ui-text">Mychelin</span>
              <span className="ml-auto text-xs text-ui-muted">
                {shared.permission === "edit" ? "Collaborator" : "View only"}
              </span>
            </div>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-5 sm:px-5">
            <SharedRecipeCard recipe={recipe} shareToken={token} />
          </main>
          {isLoggedIn ? (
            <SaveRecipeButton token={token} />
          ) : (
            <SignupNudge context="recipe" resourceName={recipe.title} />
          )}
        </div>
      );
    }

    return (
      <>
        <RecipeDetail
          recipe={recipe}
          permission={shared.permission}
          onBack={selectedRecipe ? () => setSelectedRecipe(null) : undefined}
        />
        {isLoggedIn ? (
          <SaveRecipeButton token={token} />
        ) : (
          <SignupNudge context="recipe" resourceName={recipe.title} />
        )}
      </>
    );
  }

  // Book view with clickable recipe cards
  const b = shared.data;
  return (
    <div className="min-h-screen bg-ui-surface-subtle pb-24">
      <header className="sticky top-0 z-10 border-b border-ui-border bg-ui-surface-raised">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <img src="/icons/icon-96.png" alt="Mychelin" className="h-8 w-8 rounded-lg" />
          <span className="text-sm font-semibold text-ui-text">Mychelin</span>
          <span className="ml-auto text-xs text-ui-muted">
            {shared.permission === "edit" ? "Collaborator" : "View only"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-3xl">{b.coverEmoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-ui-text">{b.title}</h1>
            {b.description && <p className="text-sm text-ui-muted">{b.description}</p>}
            <p className="text-xs text-ui-muted mt-1">{b.recipes.length} recipe{b.recipes.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Loading overlay */}
        {loadingRecipe && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
          </div>
        )}

        {!loadingRecipe && b.recipes.length === 0 ? (
          <p className="py-12 text-center text-sm text-ui-muted">No recipes in this book yet</p>
        ) : !loadingRecipe && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {b.recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => openRecipe(recipe.id)}
                className="flex flex-col rounded-2xl border border-ui-border bg-ui-surface-raised overflow-hidden text-left transition hover:border-ui-border-strong hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex h-32 items-center justify-center bg-ui-surface-subtle">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl opacity-60">🍳</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-ui-text">{recipe.title}</h3>
                  {recipe.cuisine && (
                    <span className="mt-1 inline-block text-sm text-ui-muted">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-ui-muted">{recipe.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 pb-8 text-center text-xs text-ui-muted">
          Made with <Link href="/" className="text-ui-accent hover:underline">Mychelin</Link> · cooking like home, even in your new home
        </div>
      </div>
      <SignupNudge context="book" resourceName={b.title} />
    </div>
  );
}
