"use client";

import { useEffect, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
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

// Full-screen recipe search. Debounced input that queries
// /api/recipes/search — the endpoint matches against both titles AND
// ingredient names, so typing "chicken" returns both "Chicken Rice"
// and any recipe with chicken in its ingredient list.
export function RecipeSearchModal({ onClose, onPickRecipe }: RecipeSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatchedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Debounced search. Wait 250ms after the user stops typing before
  // hitting the API so we don't spam it on every keystroke.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/recipes/search?q=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as { results: MatchedRecipe[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const handlePick = (recipeId: number) => {
    onPickRecipe(recipeId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-start sm:pt-16"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[75vh] sm:max-w-xl sm:rounded-2xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="border-b border-[var(--ui-border)] px-4 py-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ui-text)]">
                Search recipes
              </h2>
              <p className="mt-0.5 text-xs text-[var(--ui-muted)]">
                Find recipes by title, ingredient, cuisine, or notes.
              </p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--ui-border-strong)] px-2 text-xs font-medium text-[var(--ui-muted)] transition hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-2"
              aria-label="Close search"
            >
              <Cross2Icon className="h-3.5 w-3.5" />
              ESC
            </button>
          </div>
          <FilterBar
            id="global-recipe-search"
            label="Search recipes"
            query={query}
            onQueryChange={setQuery}
            placeholder="Search by recipe, ingredient, cuisine, notes"
            resultCount={hasSearched || query.trim() ? results.length : undefined}
            resultLabel={results.length === 1 ? "recipe" : "recipes"}
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--ui-accent)] border-t-transparent" />
            </div>
          )}

          {!loading && !query.trim() && (
            <EmptyState
              title="Search your recipes"
              description="Try an ingredient like chicken, belacan, or galangal. You can also search by recipe name, cuisine, or notes."
            />
          )}

          {!loading && query.trim() && results.length === 0 && hasSearched && (
            <EmptyState
              title={'No recipes match "' + query + '"'}
              description="Try another ingredient, dish name, or cuisine."
            />
          )}

          {!loading && results.length > 0 && (
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
