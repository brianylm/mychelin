"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, UtensilsCrossed, PenLine } from "lucide-react";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  cuisine: string | null;
  category: string | null;
  difficulty: string | null;
  familyMember: string | null;
  prepTime: number | null;
  cookTime: number | null;
  imageUrl: string | null;
}

export function RecipeListWithSearch({ recipes }: { recipes: Recipe[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesCuisine = !activeCuisine || recipe.cuisine === activeCuisine;
    if (!searchQuery.trim()) return matchesCuisine;
    const q = searchQuery.toLowerCase();
    return (
      matchesCuisine &&
      (recipe.title.toLowerCase().includes(q) ||
        recipe.cuisine?.toLowerCase().includes(q) ||
        recipe.category?.toLowerCase().includes(q) ||
        recipe.description?.toLowerCase().includes(q) ||
        recipe.familyMember?.toLowerCase().includes(q))
    );
  });

  const cuisines = [...new Set(recipes.map((r) => r.cuisine).filter(Boolean))];

  return (
    <>
      <div className="relative">
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-terracotta/50 focus:border-terracotta text-stone-800"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
      </div>

      {/* Cuisine Filter */}
      {cuisines.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCuisine(null)}
            className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
              !activeCuisine
                ? "bg-terracotta text-white shadow-md"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            All
          </button>
          {cuisines.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => setActiveCuisine(activeCuisine === cuisine ? null : cuisine!)}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                activeCuisine === cuisine
                  ? "bg-terracotta text-white shadow-md"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>
      )}

      {/* Recipe Grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/app/recipes/${recipe.id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            >
              <div className="h-48 bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center">
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                ) : (
                  <UtensilsCrossed className="w-14 h-14 text-stone-400" />
                )}
              </div>
              <div className="p-5">
                <h3 className="text-xl font-semibold text-stone-800 mb-2">{recipe.title}</h3>

                <div className="flex flex-wrap gap-2 mb-3">
                  {recipe.cuisine && (
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                      {recipe.difficulty}
                    </span>
                  )}
                </div>

                {recipe.familyMember && (
                  <p className="text-stone-500 text-sm">
                    From: {recipe.familyMember}
                  </p>
                )}

                {(recipe.prepTime || recipe.cookTime) && (
                  <p className="text-stone-400 text-sm mt-2">
                    ⏱️ {recipe.prepTime && `${recipe.prepTime} min prep`}
                    {recipe.prepTime && recipe.cookTime && " · "}
                    {recipe.cookTime && `${recipe.cookTime} min cook`}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : searchQuery.trim() ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-stone-300">
          <Search className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">No recipes found</h2>
          <p className="text-stone-500 mb-6 text-lg">Try a different search term</p>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-stone-300">
          <PenLine className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">No recipes yet</h2>
          <p className="text-stone-500 mb-6 text-lg">Add your family&apos;s special dishes</p>
          <Link
            href="/app/recipes/new"
            className="inline-flex items-center gap-2 bg-terracotta text-white px-8 py-4 rounded-xl text-xl font-semibold hover:bg-terracotta-600 transition-colors"
          >
            Add Your First Recipe
          </Link>
        </div>
      )}
    </>
  );
}
