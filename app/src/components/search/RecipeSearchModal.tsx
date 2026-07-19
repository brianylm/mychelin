"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { EmptyState, FilterBar, RecipeResultRow } from "@/components/ui";

interface MatchedRecipe {
  recipe: {
    id: number;
    title: string;
    cuisine: string | null;
    imageUrl: string | null;
    description: string | null;
  };
  matchedIngredient: string | null;
}

function getMatchEvidence(result: MatchedRecipe): string | null {
  if (result.matchedIngredient) {
    return "Matched ingredient: " + result.matchedIngredient;
  }
  if (result.recipe.description) return "Matched notes";
  return "Matched title";
}

interface RecipeSearchModalProps {
  onClose: () => void;
  onPickRecipe: (recipeId: number) => void;
}

export function RecipeSearchModal({ onClose, onPickRecipe }: RecipeSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatchedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  );

  useEffect(() => {
    const returnFocusTarget = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusTarget?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/recipes/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as { results: MatchedRecipe[] };
        setResults(data.results ?? []);
        setHasSearched(true);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setResults([]);
        setHasSearched(true);
        setError("Recipe search is temporarily unavailable. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handlePick = (recipeId: number) => {
    onPickRecipe(recipeId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-neutral-950/45 sm:items-start sm:px-4 sm:pt-16"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-search-title"
        className="flex h-full w-full flex-col border-[var(--ui-border)] bg-[var(--ui-surface-raised)] sm:h-auto sm:max-h-[75vh] sm:max-w-xl sm:rounded-xl sm:border sm:shadow-[0_20px_56px_rgba(40,26,19,0.18)]"
      >
        <div className="border-b border-[var(--ui-border)] px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="recipe-search-title" className="text-lg font-semibold text-[var(--ui-text)]">
                Search recipes
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-[var(--ui-muted)]">
                Find a recipe by title, ingredient, cuisine, or notes.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors duration-150 hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
              aria-label="Close search"
              title="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <FilterBar
            id="global-recipe-search"
            label="Search recipes"
            query={query}
            onQueryChange={setQuery}
            placeholder="Recipe, ingredient, cuisine, or notes"
            resultCount={hasSearched || query.trim() ? results.length : undefined}
            resultLabel={results.length === 1 ? "recipe" : "recipes"}
            autoFocus
            className="[&_input]:h-11"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {loading && (
            <div className="space-y-2" aria-label="Searching recipes">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-subtle)]"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <EmptyState title="Search unavailable" description={error} />
          )}

          {!loading && !error && !query.trim() && (
            <EmptyState
              title="Search your recipes"
              description="Try an ingredient such as chicken, belacan, or galangal, or search by dish name."
            />
          )}

          {!loading && !error && query.trim() && results.length === 0 && hasSearched && (
            <EmptyState
              title={'No recipes match "' + query + '"'}
              description="Try another ingredient, dish name, cuisine, or note."
            />
          )}

          {!loading && !error && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result) => (
                <RecipeResultRow
                  key={result.recipe.id}
                  title={result.recipe.title}
                  cuisine={result.recipe.cuisine}
                  secondaryLabel={result.recipe.description || "Recipe"}
                  ingredients={result.matchedIngredient ? [result.matchedIngredient] : []}
                  matchEvidence={getMatchEvidence(result)}
                  onSelect={() => handlePick(result.recipe.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
