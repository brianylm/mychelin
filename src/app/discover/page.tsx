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
      <div className="flex items-center justify-center gap-3 mb-3">
        <Shuffle className="w-8 h-8 text-terracotta" />
        <h1 className="text-4xl font-bold text-stone-900 font-heading">Surprise Me!</h1>
      </div>
      <p className="text-stone-500 mb-12 text-lg leading-relaxed">Not sure what to cook? Let us pick for you!</p>

      {/* Random Button */}
      <button
        onClick={getRandomRecipe}
        disabled={loading}
        className="mb-16 inline-flex items-center gap-3 px-10 py-5 bg-terracotta text-white rounded-2xl text-xl font-bold hover:bg-terracotta-600 disabled:bg-stone-400 transition-colors"
      >
        <Shuffle className="w-7 h-7" />
        {loading ? "Picking..." : "Pick a Random Recipe"}
      </button>

      {/* Result */}
      {randomRecipe && (
        <div className="bg-white rounded-3xl p-10 border border-stone-200 animate-fade-in">
          <h2 className="text-xl text-stone-500 mb-4">
            How about...
          </h2>
          
          <div className="text-4xl font-bold text-stone-800 mb-6 font-heading">
            {randomRecipe.title}
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {randomRecipe.cuisine && (
              <span className="bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-base">
                {randomRecipe.cuisine}
              </span>
            )}
            {randomRecipe.category && (
              <span className="bg-stone-100 text-stone-600 px-4 py-2 rounded-full text-base">
                {randomRecipe.category}
              </span>
            )}
          </div>

          {randomRecipe.familyMember && (
            <p className="text-stone-400 text-base mb-6 leading-relaxed">
              From: {randomRecipe.familyMember}
            </p>
          )}

          {(randomRecipe.prepTime || randomRecipe.cookTime) && (
            <p className="text-stone-400 mb-8">
              {randomRecipe.prepTime && `${randomRecipe.prepTime} min prep`}
              {randomRecipe.prepTime && randomRecipe.cookTime && " · "}
              {randomRecipe.cookTime && `${randomRecipe.cookTime} min cook`}
            </p>
          )}

          <div className="flex gap-4 justify-center">
            <Link
              href={`/recipes/${randomRecipe.id}`}
              className="px-8 py-4 bg-terracotta text-white rounded-xl text-lg font-semibold hover:bg-terracotta-600 transition-colors"
            >
              Let&apos;s Cook This!
            </Link>
            <button
              onClick={getRandomRecipe}
              className="px-8 py-4 border border-stone-200 text-stone-600 rounded-xl text-lg font-semibold hover:bg-stone-50 transition-colors"
            >
              Pick Another
            </button>
          </div>
        </div>
      )}

      {noRecipes && (
        <div className="bg-white rounded-3xl p-10 border border-stone-200">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <PenLine className="w-8 h-8 text-stone-300" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-3 font-heading">No recipes yet!</h2>
          <p className="text-stone-500 mb-8 text-lg leading-relaxed">Add some recipes first, then come back for a surprise</p>
          <Link
            href="/recipes/new"
            className="inline-block px-8 py-4 bg-terracotta text-white rounded-xl text-lg font-semibold hover:bg-terracotta-600 transition-colors"
          >
            Add Your First Recipe
          </Link>
        </div>
      )}

      {/* Ideas Section */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-3xl p-8 border border-stone-200">
          <h3 className="text-lg font-semibold text-stone-800 font-heading mb-2">Quick Meals</h3>
          <p className="text-stone-500 leading-relaxed">Under 30 minutes</p>
        </div>
        
        <div className="bg-white rounded-3xl p-8 border border-stone-200">
          <h3 className="text-lg font-semibold text-stone-800 font-heading mb-2">Family Favorites</h3>
          <p className="text-stone-500 leading-relaxed">Dishes everyone loves</p>
        </div>
        
        <div className="bg-white rounded-3xl p-8 border border-stone-200">
          <h3 className="text-lg font-semibold text-stone-800 font-heading mb-2">Heritage Recipes</h3>
          <p className="text-stone-500 leading-relaxed">Traditional dishes</p>
        </div>
      </div>
    </div>
  );
}
