"use client";

import { useState, useCallback } from "react";
import { Button } from "@radix-ui/themes";
import { useRecipeStore } from "@/store/RecipeStore";
import type { Recipe } from "@/db/schema";

interface DiscoverViewProps {
  onNavigateToRecipe: (recipeId: number) => void;
}

export function DiscoverView({ onNavigateToRecipe }: DiscoverViewProps) {
  const { recipes } = useRecipeStore();
  const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const pickRandomRecipe = useCallback(() => {
    if (recipes.length === 0) return;
    
    setIsRolling(true);
    // Add a small delay for visual effect
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * recipes.length);
      setRandomRecipe(recipes[randomIndex]);
      setIsRolling(false);
    }, 500);
  }, [recipes]);

  const handleCookThis = useCallback(() => {
    if (randomRecipe) {
      onNavigateToRecipe(randomRecipe.id);
    }
  }, [randomRecipe, onNavigateToRecipe]);

  // Empty state if no recipes
  if (recipes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 text-6xl">🎲</div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">
            No Recipes Yet
          </h2>
          <p className="text-sm text-neutral-500">
            Add some recipes to your collection first, then come back to discover what to cook!
          </p>
        </div>
      </div>
    );
  }

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

        {/* Random Recipe Button */}
        <div className="text-center">
          <Button
            onClick={pickRandomRecipe}
            disabled={isRolling}
            size="4"
            className="bg-amber-600 hover:bg-amber-700 text-lg px-8 py-4"
          >
            {isRolling ? "🎲 Rolling..." : "🎲 Surprise Me!"}
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
                <span className="inline-block bg-amber-100 text-amber-800 text-sm px-3 py-1 rounded-full">
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
              {randomRecipe.yield && (
                <span>🍽️ {randomRecipe.yield}</span>
              )}
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
              <Button
                onClick={pickRandomRecipe}
                variant="outline"
                size="3"
              >
                🔄 Try another
              </Button>
            </div>
          </div>
        )}

        {/* Recipe Stats */}
        <div className="text-center text-sm text-neutral-500">
          <p>
            You have <span className="font-medium text-neutral-700">{recipes.length}</span>{" "}
            recipe{recipes.length !== 1 ? "s" : ""} in your collection
          </p>
        </div>
      </div>
    </div>
  );
}