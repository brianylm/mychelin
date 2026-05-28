"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@radix-ui/themes";
import { useRecipeStore } from "@/store/RecipeStore";
import type { Recipe } from "@/db/schema";

interface DiscoverViewProps {
  onNavigateToRecipe: (recipeId: number) => void;
}

// Discover / "Surprise me" view. Two modes:
//  • Surprise me: pure random pick from the full recipe collection.
//  • Surprise me by X: narrow the pool to recipes matching a filter
//    query (title, cuisine, or ingredient) using /api/recipes/search,
//    then pick a random one from that result set. e.g. "surprise me
//    by chicken" picks from any recipe with chicken in it; "italian"
//    picks from Italian recipes; "soup" picks from anything with
//    "soup" in the title/cuisine.
export function DiscoverView({ onNavigateToRecipe }: DiscoverViewProps) {
  const { recipes } = useRecipeStore();
  const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [matchedPool, setMatchedPool] = useState<Recipe[] | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);

  // Re-fetch the narrowed pool whenever the filter query changes,
  // debounced 250ms so we're not hammering the endpoint on every
  // keystroke. An empty query clears the pool so "Surprise me"
  // reverts to picking from the full collection.
  useEffect(() => {
    const trimmed = filterQuery.trim();
    if (!trimmed) {
      setMatchedPool(null);
      setPoolLoading(false);
      return;
    }
    setPoolLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/recipes/search?q=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as {
          results: Array<{ recipe: Recipe; matchedIngredient: string | null }>;
        };
        setMatchedPool(data.results.map((r) => r.recipe));
      } catch {
        setMatchedPool([]);
      } finally {
        setPoolLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [filterQuery]);

  const pickRandomRecipe = useCallback(() => {
    const pool = matchedPool ?? recipes;
    if (pool.length === 0) return;

    setIsRolling(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      setRandomRecipe(pool[randomIndex]);
      setIsRolling(false);
    }, 500);
  }, [recipes, matchedPool]);

  const handleCookThis = useCallback(() => {
    if (randomRecipe) {
      onNavigateToRecipe(randomRecipe.id);
    }
  }, [randomRecipe, onNavigateToRecipe]);

  if (recipes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 text-6xl">🎲</div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">
            No Recipes Yet
          </h2>
          <p className="text-sm text-neutral-500">
            Add some recipes to your collection first, then come back to
            discover what to cook!
          </p>
        </div>
      </div>
    );
  }

  const pool = matchedPool ?? recipes;
  const isFiltered = filterQuery.trim().length > 0;
  const canRoll = pool.length > 0 && !isRolling && !poolLoading;

  return (
    <div className="flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">
            What should I cook? 🤔
          </h1>
          <p className="text-neutral-600">
            Let us surprise you with a random recipe from your collection!
          </p>
        </div>

        {/* Narrow-by filter */}
        <div className="rounded-2xl border border-[#800020]/15 bg-[#800020]/5 p-4">
          <label
            htmlFor="surprise-filter"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#521224]"
          >
            Surprise me by…
          </label>
          <input
            id="surprise-filter"
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="chicken, Italian, soup… (leave blank for all recipes)"
            className="w-full rounded-xl border border-[#800020]/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-400"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-[#800020]">
            Narrow the randomiser by an ingredient, cuisine, or keyword.
            Matches recipe titles AND ingredient lists. e.g.{" "}
            <button
              type="button"
              onClick={() => setFilterQuery("chicken")}
              className="underline underline-offset-2 hover:text-[#241017]"
            >
              chicken
            </button>
            ,{" "}
            <button
              type="button"
              onClick={() => setFilterQuery("italian")}
              className="underline underline-offset-2 hover:text-[#241017]"
            >
              italian
            </button>
            ,{" "}
            <button
              type="button"
              onClick={() => setFilterQuery("soup")}
              className="underline underline-offset-2 hover:text-[#241017]"
            >
              soup
            </button>
          </p>
          {isFiltered && !poolLoading && (
            <p className="mt-1 text-[11px] text-[#521224]">
              {pool.length === 0
                ? `No recipes match "${filterQuery.trim()}"`
                : `Picking from ${pool.length} matching recipe${
                    pool.length !== 1 ? "s" : ""
                  }`}
            </p>
          )}
        </div>

        {/* Random Recipe Button */}
        <div className="text-center">
          <Button
            onClick={pickRandomRecipe}
            disabled={!canRoll}
            size="4"
            className="bg-[#17131f] hover:bg-[#800020] text-lg px-8 py-4"
          >
            {isRolling
              ? "🎲 Rolling..."
              : poolLoading
              ? "🎲 Loading…"
              : isFiltered
              ? `🎲 Surprise me by "${filterQuery.trim()}"`
              : "🎲 Surprise Me!"}
          </Button>
        </div>

        {/* Selected Recipe Card */}
        {randomRecipe && !isRolling && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                {randomRecipe.title}
              </h3>
              {randomRecipe.cuisine && (
                <span className="inline-block bg-[#800020]/10 text-[#521224] text-sm px-3 py-1 rounded-full">
                  {randomRecipe.cuisine}
                </span>
              )}
            </div>

            {randomRecipe.description && (
              <p className="text-neutral-600 text-center mb-4">
                {randomRecipe.description}
              </p>
            )}

            {/* Recipe Details */}
            <div className="flex justify-center gap-4 mb-6 text-sm text-neutral-500">
              {randomRecipe.prepTime && (
                <span>⏱️ Prep: {randomRecipe.prepTime}m</span>
              )}
              {randomRecipe.cookTime && (
                <span>🔥 Cook: {randomRecipe.cookTime}m</span>
              )}
              {randomRecipe.yield && <span>🍽️ {randomRecipe.yield}</span>}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleCookThis}
                size="3"
                className="bg-green-600 hover:bg-green-700"
              >
                🍳 Cook this!
              </Button>
              <Button onClick={pickRandomRecipe} variant="outline" size="3">
                🔄 Try another
              </Button>
            </div>
          </div>
        )}

        {/* Recipe Stats */}
        <div className="text-center text-sm text-neutral-500">
          <p>
            You have{" "}
            <span className="font-medium text-neutral-700">
              {recipes.length}
            </span>{" "}
            recipe{recipes.length !== 1 ? "s" : ""} in your collection
          </p>
        </div>
      </div>
    </div>
  );
}
