"use client";

import { useEffect, useRef, useState } from "react";
import { Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by recipe name or ingredient (e.g. chicken)…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="rounded p-0.5 text-neutral-400 hover:text-neutral-600"
              aria-label="Clear"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-500 hover:bg-neutral-50"
            aria-label="Close"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="px-6 py-12 text-center text-sm text-neutral-500">
              <div className="mb-3 text-3xl">🔎</div>
              <p className="font-medium text-neutral-700">
                Search your recipes by ingredient
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Type an ingredient like <em>chicken</em>, <em>belacan</em>,
                or <em>galangal</em> to find every recipe that uses it. You
                can also search by recipe name.
              </p>
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && hasSearched && (
            <div className="px-6 py-12 text-center text-sm text-neutral-500">
              No recipes match &ldquo;{query}&rdquo;.
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="divide-y divide-neutral-100">
              {results.map(({ recipe, matchedIngredient }) => (
                <li key={recipe.id}>
                  <button
                    onClick={() => handlePick(recipe.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#800020]/5"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#800020]/5">
                      {recipe.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={recipe.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-base">🍳</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-neutral-900">
                        {recipe.title}
                      </div>
                      <div className="truncate text-[11px] text-neutral-500">
                        {matchedIngredient ? (
                          <>
                            Found in ingredients:{" "}
                            <span className="font-medium text-[#800020]">
                              {matchedIngredient}
                            </span>
                          </>
                        ) : (
                          <>
                            {recipe.cuisine && (
                              <span className="mr-1 text-[#800020]">
                                {recipe.cuisine}
                              </span>
                            )}
                            {recipe.description || "Matched by title"}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
