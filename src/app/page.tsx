import Link from "next/link";
import { db, recipes, recipeBooks } from "@/db";
import { desc } from "drizzle-orm";
import { PenLine, UtensilsCrossed } from "lucide-react";

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
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="py-16 md:py-20">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-stone-900 mb-6 font-heading leading-tight">
          Keep Your Family<br />Recipes Safe
        </h1>
        <p className="text-xl text-stone-500 mb-10 max-w-xl leading-relaxed">
          Save the special dishes from your parents and grandparents. 
          Share cooking memories with your whole family.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/capture"
            className="inline-flex items-center justify-center gap-2 bg-terracotta text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-terracotta-600 transition-colors"
          >
            AI Recipe Capture
          </Link>
          <Link
            href="/recipes/new"
            className="inline-flex items-center justify-center gap-2 bg-white text-stone-700 border border-stone-200 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-stone-50 transition-colors"
          >
            <PenLine className="w-5 h-5" />
            Add a Recipe
          </Link>
        </div>
      </section>

      {/* Recent Recipes */}
      {recentRecipes.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-3xl font-bold text-stone-900 font-heading">Recent Recipes</h2>
            <Link href="/recipes" className="text-terracotta hover:text-terracotta-600 text-base font-medium">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="bg-white rounded-3xl overflow-hidden border border-stone-200 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="aspect-[4/3] bg-stone-100 flex items-center justify-center">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-stone-100" />
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-stone-800 mb-2 font-heading">{recipe.title}</h3>
                  {recipe.cuisine && (
                    <span className="inline-block bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.familyMember && (
                    <p className="text-stone-400 mt-3 text-sm">From: {recipe.familyMember}</p>
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
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-3xl font-bold text-stone-900 font-heading">Family Recipe Books</h2>
            <Link href="/books" className="text-terracotta hover:text-terracotta-600 text-base font-medium">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="bg-white rounded-3xl p-8 border border-stone-200 hover:shadow-lg transition-shadow duration-300"
              >
                <h3 className="text-xl font-semibold text-stone-800 font-heading">{book.name}</h3>
                {book.description && (
                  <p className="text-stone-500 mt-2 leading-relaxed">{book.description}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {recentRecipes.length === 0 && (
        <section className="text-center py-20 bg-white rounded-3xl border border-stone-200">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <UtensilsCrossed className="w-8 h-8 text-stone-400" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-3 font-heading">No recipes yet</h2>
          <p className="text-stone-500 mb-8 leading-relaxed">Start by adding your first family recipe</p>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 bg-terracotta text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-terracotta-600 transition-colors"
          >
            Add Your First Recipe
          </Link>
        </section>
      )}
    </div>
  );
}
