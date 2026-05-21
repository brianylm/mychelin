import { db, recipes } from "@/db";
import { desc } from "drizzle-orm";
import { RecipeListWithSearch } from "@/components/RecipeListWithSearch";
import { AddRecipeMenu } from "@/components/AddRecipeMenu";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const allRecipes = await db.query.recipes.findMany({
    orderBy: [desc(recipes.createdAt)],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-stone-900">All Recipes</h1>
        <AddRecipeMenu />
      </div>

      <RecipeListWithSearch recipes={allRecipes} />
    </div>
  );
}
