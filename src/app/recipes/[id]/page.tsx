import Link from "next/link";
import { db, recipes, recipeVersions } from "@/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  notes?: string;
}

interface Step {
  step: number;
  text: string;
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
    with: {
      versions: {
        orderBy: [desc(recipeVersions.versionNumber)],
        limit: 1,
      },
    },
  });

  if (!recipe) {
    notFound();
  }

  const latestVersion = recipe.versions[0];
  const ingredients = (latestVersion?.ingredients as Ingredient[]) || [];
  const instructions = (latestVersion?.instructions as Step[]) || [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <Link
        href="/recipes"
        className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-800 mb-6 text-lg"
      >
        ← Back to Recipes
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-amber-200 mb-8">
        <div className="h-64 bg-amber-200 flex items-center justify-center">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-9xl">🍽️</span>
          )}
        </div>
        
        <div className="p-6">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">{recipe.title}</h1>
          
          {recipe.description && (
            <p className="text-lg text-amber-700 mb-4">{recipe.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.cuisine && (
              <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-lg">
                {recipe.cuisine}
              </span>
            )}
            {recipe.category && (
              <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-lg">
                {recipe.category}
              </span>
            )}
            {recipe.difficulty && (
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-lg capitalize">
                {recipe.difficulty}
              </span>
            )}
          </div>

          {/* Cooking info */}
          <div className="flex flex-wrap gap-6 text-lg text-amber-600">
            {recipe.prepTime && (
              <span>⏱️ Prep: {recipe.prepTime} min</span>
            )}
            {recipe.cookTime && (
              <span>🔥 Cook: {recipe.cookTime} min</span>
            )}
            {recipe.servings && (
              <span>🍽️ Serves: {recipe.servings}</span>
            )}
          </div>
        </div>
      </div>

      {/* Family Story */}
      {(recipe.familyMember || recipe.origin || recipe.story) && (
        <section className="bg-amber-100 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">👨‍👩‍👧</span> The Story Behind This Dish
          </h2>
          
          {recipe.familyMember && (
            <p className="text-lg text-amber-800 mb-2">
              <strong>Passed down by:</strong> {recipe.familyMember}
            </p>
          )}
          
          {recipe.origin && (
            <p className="text-lg text-amber-800 mb-2">
              <strong>Origin:</strong> {recipe.origin}
            </p>
          )}
          
          {recipe.story && (
            <p className="text-lg text-amber-700 mt-4 italic">
              &ldquo;{recipe.story}&rdquo;
            </p>
          )}
        </section>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 mb-8">
          <h2 className="text-xl font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🥬</span> Ingredients
          </h2>
          
          <ul className="space-y-3">
            {ingredients.map((ing, index) => (
              <li key={index} className="flex items-center gap-3 text-lg">
                <span className="w-3 h-3 bg-amber-400 rounded-full flex-shrink-0"></span>
                <span>
                  {ing.amount && <strong>{ing.amount} </strong>}
                  {ing.unit && <span>{ing.unit} </span>}
                  <span className="text-amber-900">{ing.name}</span>
                  {ing.notes && <span className="text-amber-500"> ({ing.notes})</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Instructions */}
      {instructions.length > 0 && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 mb-8">
          <h2 className="text-xl font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span> How to Cook
          </h2>
          
          <ol className="space-y-6">
            {instructions.map((step) => (
              <li key={step.step} className="flex gap-4">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {step.step}
                </div>
                <p className="text-lg text-amber-900 pt-1">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Version info */}
      {latestVersion && (
        <p className="text-center text-amber-500 text-sm">
          Version {latestVersion.versionNumber} · Last updated {new Date(latestVersion.createdAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
