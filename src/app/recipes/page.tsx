import Link from "next/link";
import { db, recipes } from "@/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const allRecipes = await db.query.recipes.findMany({
    orderBy: [desc(recipes.createdAt)],
  });

  // Group by cuisine
  const cuisines = [...new Set(allRecipes.map(r => r.cuisine).filter(Boolean))];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-amber-900">All Recipes</h1>
        <Link
          href="/recipes/new"
          className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-amber-700"
        >
          <span>✍️</span> Add Recipe
        </Link>
      </div>

      {/* Cuisine Filter */}
      {cuisines.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="px-4 py-2 bg-amber-600 text-white rounded-full font-medium">All</span>
          {cuisines.map((cuisine) => (
            <span
              key={cuisine}
              className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 cursor-pointer"
            >
              {cuisine}
            </span>
          ))}
        </div>
      )}

      {/* Recipe Grid */}
      {allRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-amber-200 hover:shadow-md transition-shadow"
            >
              <div className="h-48 bg-amber-200 flex items-center justify-center">
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-7xl">🍽️</span>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-xl font-semibold text-amber-900 mb-2">{recipe.title}</h3>
                
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
                  <p className="text-amber-600 text-sm">
                    👨‍👩‍👧 From: {recipe.familyMember}
                  </p>
                )}

                {(recipe.prepTime || recipe.cookTime) && (
                  <p className="text-amber-500 text-sm mt-2">
                    ⏱️ {recipe.prepTime && `${recipe.prepTime} min prep`}
                    {recipe.prepTime && recipe.cookTime && " · "}
                    {recipe.cookTime && `${recipe.cookTime} min cook`}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-amber-300">
          <div className="text-7xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-amber-800 mb-2">No recipes yet</h2>
          <p className="text-amber-600 mb-6 text-lg">Add your family&apos;s special dishes</p>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 bg-amber-600 text-white px-8 py-4 rounded-xl text-xl font-semibold hover:bg-amber-700"
          >
            Add Your First Recipe
          </Link>
        </div>
      )}
    </div>
  );
}
