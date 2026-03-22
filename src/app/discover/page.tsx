"use client";

import { useState } from "react";
import Link from "next/link";
import { Shuffle, PenLine } from "lucide-react";

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
      <div className="flex items-center justify-center gap-3 mb-2">
        <Shuffle className="w-8 h-8 text-terracotta" />
        <h1 className="text-3xl font-bold text-stone-900">Surprise Me!</h1>
      </div>
      <p className="text-stone-600 mb-8 text-lg">Not sure what to cook? Let us pick for you!</p>

      {/* Random Button */}
      <button
        onClick={getRandomRecipe}
        disabled={loading}
        className="mb-12 inline-flex items-center gap-3 px-12 py-6 bg-terracotta text-white rounded-2xl text-2xl font-bold hover:bg-terracotta-600 disabled:bg-stone-400 transition-all transform hover:scale-105"
      >
        <Shuffle className="w-7 h-7" />
        {loading ? "Picking..." : "Pick a Random Recipe"}
      </button>

      {/* Result */}
      {randomRecipe && (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-stone-200 animate-fade-in">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-stone-800 mb-4">
            How about...
          </h2>
          
          <div className="text-4xl font-bold text-stone-800 mb-4 font-heading">
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
            <p className="text-stone-500 text-lg mb-6">
              From: {randomRecipe.familyMember}
            </p>
          )}

          {(randomRecipe.prepTime || randomRecipe.cookTime) && (
            <p className="text-stone-400 mb-6">
              ⏱️ {randomRecipe.prepTime && `${randomRecipe.prepTime} min prep`}
              {randomRecipe.prepTime && randomRecipe.cookTime && " · "}
              {randomRecipe.cookTime && `${randomRecipe.cookTime} min cook`}
            </p>
          )}

          <div className="flex gap-4 justify-center">
            <Link
              href={`/recipes/${randomRecipe.id}`}
              className="px-8 py-4 bg-terracotta text-white rounded-xl text-xl font-semibold hover:bg-terracotta-600 transition-colors"
            >
              Let&apos;s Cook This!
            </Link>
            <button
              onClick={getRandomRecipe}
              className="px-8 py-4 border-2 border-stone-300 text-stone-600 rounded-xl text-xl font-semibold hover:bg-stone-50 transition-colors"
            >
              Pick Another
            </button>
          </div>
        </div>
      )}

      {noRecipes && (
        <div className="bg-white rounded-2xl p-8 shadow-md border border-stone-200">
          <PenLine className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">No recipes yet!</h2>
          <p className="text-stone-500 mb-6 text-lg">Add some recipes first, then come back for a surprise</p>
          <Link
            href="/recipes/new"
            className="inline-block px-8 py-4 bg-terracotta text-white rounded-xl text-xl font-semibold hover:bg-terracotta-600 transition-colors"
          >
            Add Your First Recipe
          </Link>
        </div>
      )}

      {/* Ideas Section */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="text-4xl mb-3">🍜</div>
          <h3 className="text-lg font-semibold text-stone-800">Quick Meals</h3>
          <p className="text-stone-500">Under 30 minutes</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
          <h3 className="text-lg font-semibold text-stone-800">Family Favorites</h3>
          <p className="text-stone-500">Dishes everyone loves</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="text-lg font-semibold text-stone-800">Heritage Recipes</h3>
          <p className="text-stone-500">Traditional dishes</p>
        </div>
      </div>
    </div>
  );
}
