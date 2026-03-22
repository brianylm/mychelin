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
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <h1 className="text-4xl font-bold text-stone-900 font-heading">All Recipes</h1>
        <AddRecipeMenu />
      </div>

      <RecipeListWithSearch recipes={allRecipes} />
    </div>
  );
}
