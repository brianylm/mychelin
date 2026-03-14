import Link from "next/link";
import { db, recipes } from "@/db";
import { desc } from "drizzle-orm";
import { RecipeListWithSearch } from "@/components/RecipeListWithSearch";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const allRecipes = await db.query.recipes.findMany({
    orderBy: [desc(recipes.createdAt)],
  });

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

      <RecipeListWithSearch recipes={allRecipes} />
    </div>
  );
}
