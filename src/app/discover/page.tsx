"use client";

import { useState } from "react";
import Link from "next/link";

interface Recipe {
  id: string;
  title: string;
  cuisine: string | null;
  category: string | null;
  familyMember: string | null;
  prepTime: number | null;
  cookTime: number | null;
}

export default function DiscoverPage() {
  const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [noRecipes, setNoRecipes] = useState(false);

  const getRandomRecipe = async () => {
    setLoading(true);
    setNoRecipes(false);
    
    try {
      const res = await fetch("/api/recipes");
      const recipes: Recipe[] = await res.json();
      
      if (recipes.length === 0) {
        setNoRecipes(true);
        setRandomRecipe(null);
      } else {
        const random = recipes[Math.floor(Math.random() * recipes.length)];
        setRandomRecipe(random);
      }
    } catch {
      setNoRecipes(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-3xl font-bold text-amber-900 mb-2">🎲 Surprise Me!</h1>
      <p className="text-amber-600 mb-8 text-lg">Not sure what to cook? Let us pick for you!</p>

      {/* Random Button */}
      <button
        onClick={getRandomRecipe}
        disabled={loading}
        className="mb-12 px-12 py-6 bg-amber-600 text-white rounded-2xl text-2xl font-bold hover:bg-amber-700 disabled:bg-amber-400 transition-all transform hover:scale-105"
      >
        {loading ? "🎰 Picking..." : "🎲 Pick a Random Recipe"}
      </button>

      {/* Result */}
      {randomRecipe && (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-amber-200 animate-fade-in">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-amber-900 mb-4">
            How about...
          </h2>
          
          <div className="text-4xl font-bold text-amber-800 mb-4">
            {randomRecipe.title}
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {randomRecipe.cuisine && (
              <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-lg">
                {randomRecipe.cuisine}
              </span>
            )}
            {randomRecipe.category && (
              <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-lg">
                {randomRecipe.category}
              </span>
            )}
          </div>

          {randomRecipe.familyMember && (
            <p className="text-amber-600 text-lg mb-6">
              👨‍👩‍👧 From: {randomRecipe.familyMember}
            </p>
          )}

          {(randomRecipe.prepTime || randomRecipe.cookTime) && (
            <p className="text-amber-500 mb-6">
              ⏱️ {randomRecipe.prepTime && `${randomRecipe.prepTime} min prep`}
              {randomRecipe.prepTime && randomRecipe.cookTime && " · "}
              {randomRecipe.cookTime && `${randomRecipe.cookTime} min cook`}
            </p>
          )}

          <div className="flex gap-4 justify-center">
            <Link
              href={`/recipes/${randomRecipe.id}`}
              className="px-8 py-4 bg-amber-600 text-white rounded-xl text-xl font-semibold hover:bg-amber-700"
            >
              Let&apos;s Cook This!
            </Link>
            <button
              onClick={getRandomRecipe}
              className="px-8 py-4 border-2 border-amber-300 text-amber-700 rounded-xl text-xl font-semibold hover:bg-amber-50"
            >
              Pick Another
            </button>
          </div>
        </div>
      )}

      {noRecipes && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-amber-200">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-amber-800 mb-2">No recipes yet!</h2>
          <p className="text-amber-600 mb-6 text-lg">Add some recipes first, then come back for a surprise</p>
          <Link
            href="/recipes/new"
            className="inline-block px-8 py-4 bg-amber-600 text-white rounded-xl text-xl font-semibold hover:bg-amber-700"
          >
            Add Your First Recipe
          </Link>
        </div>
      )}

      {/* Ideas Section */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <div className="text-4xl mb-3">🍜</div>
          <h3 className="text-lg font-semibold text-amber-900">Quick Meals</h3>
          <p className="text-amber-600">Under 30 minutes</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
          <h3 className="text-lg font-semibold text-amber-900">Family Favorites</h3>
          <p className="text-amber-600">Dishes everyone loves</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="text-lg font-semibold text-amber-900">Heritage Recipes</h3>
          <p className="text-amber-600">Traditional dishes</p>
        </div>
      </div>
    </div>
  );
}
