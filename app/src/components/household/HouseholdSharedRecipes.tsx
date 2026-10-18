"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, ChefHat, Download, Loader2, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface SharedRecipeRow {
  id: number;
  title: string;
  cuisine: string | null;
  status: string;
  yield: string | null;
  imageUrl: string | null;
  ownerId: number;
  ownerName: string;
  isOwner: boolean;
}

interface SharedRecipeDetail {
  id: number;
  title: string;
  description: string | null;
  cuisine: string | null;
  yield: string | null;
  ingredients: Array<{
    name: string;
    quantity: number | null;
    unit: string | null;
    approximate: boolean;
    quantityText: string | null;
    notes: string | null;
  }>;
  instructions: Array<{ stepNumber: number; content: string; tip: string | null }>;
}

export function HouseholdSharedRecipes({
  onCookRecipe,
}: {
  onCookRecipe?: (recipeId: number) => void;
}) {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [sharedRecipes, setSharedRecipes] = useState<SharedRecipeRow[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [viewingRecipeId, setViewingRecipeId] = useState<number | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<SharedRecipeDetail | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);

  const loadRecipes = useCallback(async () => {
    try {
      const res = await fetch("/api/households/recipes");
      if (!res.ok) return;
      const data = await res.json();
      setSharedRecipes(Array.isArray(data.recipes) ? data.recipes : []);
    } catch {
      // best-effort — the recipes card stays empty rather than erroring
    } finally {
      setRecipesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  const handleShareAll = async () => {
    const confirmed = window.confirm(
      "Share all your current recipes with the household? This covers your library now — recipes you add later stay private until you share them individually."
    );
    if (!confirmed || sharing) return;
    setSharing(true);
    try {
      const res = await fetch("/api/households/recipes", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to share recipes");
      addToast(
        `Shared ${data.count ?? 0} recipe${data.count === 1 ? "" : "s"} with the household`,
        "success"
      );
      await loadRecipes();
      await qc.invalidateQueries({ queryKey: ["recipes"] });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to share recipes", "error");
    } finally {
      setSharing(false);
    }
  };

  const openRecipeView = async (recipeId: number) => {
    setViewingRecipeId(recipeId);
    setViewingRecipe(null);
    setViewingLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) throw new Error("Failed to load recipe");
      const data = await res.json();
      setViewingRecipe({
        id: data.id,
        title: data.title,
        description: data.description ?? null,
        cuisine: data.cuisine ?? null,
        yield: data.yield ?? null,
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        instructions: Array.isArray(data.instructions) ? data.instructions : [],
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load recipe", "error");
      setViewingRecipeId(null);
    } finally {
      setViewingLoading(false);
    }
  };

  const handleImportRecipe = async (recipeId: number) => {
    if (importingId != null) return;
    setImportingId(recipeId);
    try {
      const res = await fetch(`/api/households/recipes/${recipeId}/import`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to import recipe");
      addToast(`Imported "${data.title ?? "recipe"}" to your library`, "success");
      setViewingRecipeId(null);
      await loadRecipes();
      await qc.invalidateQueries({ queryKey: ["recipes"] });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to import recipe", "error");
    } finally {
      setImportingId(null);
    }
  };

  return (
    <>
      {/* Shared recipes — Slice 3 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">From your household</h3>
          <button
            type="button"
            onClick={handleShareAll}
            disabled={sharing}
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:border-ui-accent/40 hover:text-ui-accent disabled:opacity-40"
          >
            Share all my recipes
          </button>
        </div>
        <p className="mb-3 text-xs text-neutral-500">
          Recipes everyone in the household can read and cook with. Yours stay private until
          you share them.
        </p>
        {recipesLoading ? (
          <p className="text-xs text-ui-muted">Loading…</p>
        ) : sharedRecipes.length === 0 ? (
          <p className="text-xs text-ui-muted">
            Nothing shared yet. Share a recipe from its share menu, or use &ldquo;Share all my
            recipes&rdquo;.
          </p>
        ) : (
          <ul className="space-y-2">
            {sharedRecipes.map((recipe) => (
              <li
                key={recipe.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 px-3 py-2.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-accent/10 text-ui-accent">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {recipe.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                    {recipe.isOwner
                      ? "yours"
                      : `by ${recipe.ownerName}`}
                    {recipe.cuisine ? ` · ${recipe.cuisine}` : ""}
                  </p>
                </div>
                {recipe.isOwner ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-ui-accent/10 px-2 py-0.5 text-[10px] font-semibold text-ui-accent">
                    <Check className="h-3 w-3" />
                    Shared
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openRecipeView(recipe.id)}
                      className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-ui-accent/40 hover:text-ui-accent"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onCookRecipe?.(recipe.id)}
                      title="Cook With Me — practice mode, nothing is saved"
                      className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-ui-accent/40 hover:text-ui-accent"
                    >
                      Cook
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImportRecipe(recipe.id)}
                      disabled={importingId != null}
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-ui-accent/40 hover:text-ui-accent disabled:opacity-40"
                    >
                      {importingId === recipe.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Import
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {viewingRecipeId != null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-ui-surface p-5 text-ui-action shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="logo-serif text-xl font-bold leading-tight text-neutral-900">
                  {viewingRecipe?.title ?? "Recipe"}
                </h3>
                {viewingRecipe && (viewingRecipe.cuisine || viewingRecipe.yield) && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {[viewingRecipe.cuisine, viewingRecipe.yield].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewingRecipeId(null)}
                aria-label="Close recipe"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ui-muted transition hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {viewingLoading || !viewingRecipe ? (
              <p className="py-10 text-center text-sm text-neutral-500">Loading recipe…</p>
            ) : (
              <>
                {viewingRecipe.description && (
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{viewingRecipe.description}</p>
                )}

                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-muted">
                    Ingredients
                  </p>
                  {viewingRecipe.ingredients.length === 0 ? (
                    <p className="mt-1 text-xs text-ui-muted">No ingredients listed.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {viewingRecipe.ingredients.map((ing, index) => (
                        <li key={index} className="text-sm text-neutral-700">
                          {ing.quantityText ??
                            (ing.quantity != null ? `${ing.quantity}${ing.unit ? ` ${ing.unit}` : ""}` : "")}{" "}
                          {ing.name}
                          {ing.notes ? <span className="text-neutral-500"> — {ing.notes}</span> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-muted">
                    Steps
                  </p>
                  {viewingRecipe.instructions.length === 0 ? (
                    <p className="mt-1 text-xs text-ui-muted">No steps listed.</p>
                  ) : (
                    <ol className="mt-2 space-y-2">
                      {viewingRecipe.instructions.map((inst) => (
                        <li key={inst.stepNumber} className="text-sm leading-6 text-neutral-700">
                          <span className="mr-1 font-semibold text-ui-accent">{inst.stepNumber}.</span>
                          {inst.content}
                          {inst.tip && (
                            <span className="mt-0.5 block text-xs text-neutral-500">{inst.tip}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewingRecipeId(null);
                      onCookRecipe?.(viewingRecipe.id);
                    }}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ui-action px-4 text-sm font-semibold text-white transition-colors hover:bg-ui-accent"
                  >
                    <ChefHat className="h-4 w-4" />
                    Cook with me (practice)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImportRecipe(viewingRecipe.id)}
                    disabled={importingId != null}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-ui-accent transition-colors hover:bg-neutral-50 disabled:opacity-40"
                  >
                    {importingId === viewingRecipe.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Import to my recipes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
