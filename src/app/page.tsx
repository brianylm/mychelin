import Link from "next/link";
import { db, recipes, recipeBooks } from "@/db";
import { desc } from "drizzle-orm";
import { Sparkles, PenLine, Calendar, Shuffle, UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recentRecipes = await db.query.recipes.findMany({
    limit: 6,
    orderBy: [desc(recipes.createdAt)],
  });

  const books = await db.query.recipeBooks.findMany({
    limit: 4,
    orderBy: [desc(recipeBooks.createdAt)],
  });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-b from-stone-100 to-stone-50 rounded-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4">
          Keep Your Family Recipes Safe
        </h1>
        <p className="text-xl text-stone-600 mb-8 max-w-2xl mx-auto">
          Save the special dishes from your parents and grandparents. 
          Share cooking memories with your whole family.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/capture"
            className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-xl text-xl font-semibold hover:bg-purple-700 hover:scale-[1.02] transition-all duration-200"
          >
            <Sparkles className="w-6 h-6" />
            AI Recipe Capture
          </Link>
          <Link
            href="/recipes/new"
            className="inline-flex items-center justify-center gap-2 bg-terracotta text-white px-8 py-4 rounded-xl text-xl font-semibold hover:bg-terracotta-600 hover:scale-[1.02] transition-all duration-200"
          >
            <PenLine className="w-6 h-6" />
            Add a Recipe
          </Link>
          <Link
            href="/recipes"
            className="inline-flex items-center justify-center gap-2 bg-white text-stone-700 border-2 border-stone-300 px-8 py-4 rounded-xl text-xl font-semibold hover:bg-stone-50 hover:scale-[1.02] transition-all duration-200"
          >
            📖 Browse Recipes
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-2xl font-bold text-stone-800 mb-6">What would you like to do?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/capture"
            className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-6 shadow-md border border-purple-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            <Sparkles className="w-10 h-10 text-purple-600 mb-3" />
            <h3 className="text-xl font-semibold text-purple-900 mb-2">AI Recipe Capture</h3>
            <p className="text-purple-600">Turn family conversations into structured recipes</p>
          </Link>

          <Link
            href="/recipes/new"
            className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            <PenLine className="w-10 h-10 text-terracotta mb-3" />
            <h3 className="text-xl font-semibold text-stone-800 mb-2">Write Down a Recipe</h3>
            <p className="text-stone-600">Save a dish before it&apos;s forgotten</p>
          </Link>

          <Link
            href="/planner"
            className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            <Calendar className="w-10 h-10 text-terracotta mb-3" />
            <h3 className="text-xl font-semibold text-stone-800 mb-2">Plan My Meals</h3>
            <p className="text-stone-600">Organize your weekly menu</p>
          </Link>

          <Link
            href="/discover"
            className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            <Shuffle className="w-10 h-10 text-terracotta mb-3" />
            <h3 className="text-xl font-semibold text-stone-800 mb-2">Surprise Me!</h3>
            <p className="text-stone-600">Get a random recipe idea</p>
          </Link>
        </div>
      </section>

      {/* Recent Recipes */}
      {recentRecipes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-stone-800">Recent Recipes</h2>
            <Link href="/recipes" className="text-terracotta hover:text-terracotta-600 text-lg">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              >
                <div className="h-40 bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                  ) : (
                    <UtensilsCrossed className="w-12 h-12 text-stone-400" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-stone-800 mb-1">{recipe.title}</h3>
                  {recipe.cuisine && (
                    <span className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.familyMember && (
                    <p className="text-stone-500 mt-2 text-sm">From: {recipe.familyMember}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recipe Books */}
      {books.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-stone-800">Family Recipe Books</h2>
            <Link href="/books" className="text-terracotta hover:text-terracotta-600 text-lg">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex items-center gap-4"
              >
                <div className="text-5xl">📚</div>
                <div>
                  <h3 className="text-xl font-semibold text-stone-800">{book.name}</h3>
                  {book.description && (
                    <p className="text-stone-500 mt-1">{book.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {recentRecipes.length === 0 && (
        <section className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-stone-300">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2">No recipes yet!</h2>
          <p className="text-stone-500 mb-6">Start by adding your first family recipe</p>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 bg-terracotta text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-terracotta-600 transition-colors"
          >
            Add Your First Recipe
          </Link>
        </section>
      )}
    </div>
  );
}
