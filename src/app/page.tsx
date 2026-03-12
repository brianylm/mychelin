import Link from "next/link";
import { db, recipes, recipeBooks } from "@/db";
import { desc } from "drizzle-orm";

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
      <section className="text-center py-12 bg-gradient-to-b from-amber-100 to-amber-50 rounded-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">
          Keep Your Family Recipes Safe
        </h1>
        <p className="text-xl text-amber-700 mb-8 max-w-2xl mx-auto">
          Save the special dishes from your parents and grandparents. 
          Share cooking memories with your whole family.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/capture"
            className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-xl text-xl font-semibold hover:bg-purple-700 transition-colors"
          >
            <span className="text-2xl">🤖</span>
            AI Recipe Capture
          </Link>
          <Link
            href="/recipes/new"
            className="inline-flex items-center justify-center gap-2 bg-amber-600 text-white px-8 py-4 rounded-xl text-xl font-semibold hover:bg-amber-700 transition-colors"
          >
            <span className="text-2xl">✍️</span>
            Add a Recipe
          </Link>
          <Link
            href="/recipes"
            className="inline-flex items-center justify-center gap-2 bg-white text-amber-700 border-2 border-amber-300 px-8 py-4 rounded-xl text-xl font-semibold hover:bg-amber-50 transition-colors"
          >
            <span className="text-2xl">📖</span>
            Browse Recipes
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-2xl font-bold text-amber-800 mb-6">What would you like to do?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/capture"
            className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-6 shadow-sm border border-purple-200 hover:shadow-md transition-shadow"
          >
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-xl font-semibold text-purple-900 mb-2">AI Recipe Capture</h3>
            <p className="text-purple-600">Turn family conversations into structured recipes</p>
          </Link>

          <Link
            href="/recipes/new"
            className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 hover:shadow-md transition-shadow"
          >
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-xl font-semibold text-amber-900 mb-2">Write Down a Recipe</h3>
            <p className="text-amber-600">Save a dish before it&apos;s forgotten</p>
          </Link>

          <Link
            href="/planner"
            className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 hover:shadow-md transition-shadow"
          >
            <div className="text-4xl mb-3">📅</div>
            <h3 className="text-xl font-semibold text-amber-900 mb-2">Plan My Meals</h3>
            <p className="text-amber-600">Organize your weekly menu</p>
          </Link>

          <Link
            href="/discover"
            className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 hover:shadow-md transition-shadow"
          >
            <div className="text-4xl mb-3">🎲</div>
            <h3 className="text-xl font-semibold text-amber-900 mb-2">Surprise Me!</h3>
            <p className="text-amber-600">Get a random recipe idea</p>
          </Link>
        </div>
      </section>

      {/* Recent Recipes */}
      {recentRecipes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-amber-800">Recent Recipes</h2>
            <Link href="/recipes" className="text-amber-600 hover:text-amber-800 text-lg">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-amber-200 hover:shadow-md transition-shadow"
              >
                <div className="h-40 bg-amber-200 flex items-center justify-center">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">🍽️</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-amber-900 mb-1">{recipe.title}</h3>
                  {recipe.cuisine && (
                    <span className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.familyMember && (
                    <p className="text-amber-600 mt-2 text-sm">From: {recipe.familyMember}</p>
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
            <h2 className="text-2xl font-bold text-amber-800">Family Recipe Books</h2>
            <Link href="/books" className="text-amber-600 hover:text-amber-800 text-lg">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div className="text-5xl">📚</div>
                <div>
                  <h3 className="text-xl font-semibold text-amber-900">{book.name}</h3>
                  {book.description && (
                    <p className="text-amber-600 mt-1">{book.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {recentRecipes.length === 0 && (
        <section className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-amber-300">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <h2 className="text-2xl font-bold text-amber-800 mb-2">No recipes yet!</h2>
          <p className="text-amber-600 mb-6">Start by adding your first family recipe</p>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-amber-700"
          >
            Add Your First Recipe
          </Link>
        </section>
      )}
    </div>
  );
}
