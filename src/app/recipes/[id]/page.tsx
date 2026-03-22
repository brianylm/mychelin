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
        className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-8 text-base font-medium transition-colors"
      >
        ← Back to Recipes
      </Link>

      {/* Hero Image */}
      <div className="rounded-3xl overflow-hidden border border-stone-200 mb-10">
        <div className="aspect-[16/9] bg-stone-100 flex items-center justify-center">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-stone-100" />
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 font-heading leading-tight">{recipe.title}</h1>
          <Link
            href={`/recipes/new?id=${recipe.id}`}
            className="px-5 py-2.5 bg-stone-100 text-stone-700 rounded-xl text-base font-medium hover:bg-stone-200 transition-colors flex-shrink-0 ml-4"
          >
            Edit
          </Link>
        </div>
        
        {recipe.description && (
          <p className="text-lg text-stone-500 mb-6 leading-relaxed">{recipe.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {recipe.cuisine && (
            <span className="bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-base">
              {recipe.cuisine}
            </span>
          )}
          {recipe.category && (
            <span className="bg-stone-100 text-stone-600 px-4 py-2 rounded-full text-base">
              {recipe.category}
            </span>
          )}
          {recipe.difficulty && (
            <span className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-base capitalize">
              {recipe.difficulty}
            </span>
          )}
        </div>

        {/* Cooking info */}
        <div className="flex flex-wrap gap-8 text-base text-stone-500">
          {recipe.prepTime && (
            <span>Prep: {recipe.prepTime} min</span>
          )}
          {recipe.cookTime && (
            <span>Cook: {recipe.cookTime} min</span>
          )}
          {recipe.servings && (
            <span>Serves: {recipe.servings}</span>
          )}
        </div>
      </div>

      {/* Family Story */}
      {(recipe.familyMember || recipe.origin || recipe.story) && (
        <section className="bg-stone-100 rounded-3xl p-8 md:p-10 mb-10">
          <h2 className="text-2xl font-bold text-stone-800 mb-5 font-heading">The Story Behind This Dish</h2>
          
          {recipe.familyMember && (
            <p className="text-base text-stone-700 mb-3 leading-relaxed">
              <span className="font-semibold">Passed down by:</span> {recipe.familyMember}
            </p>
          )}
          
          {recipe.origin && (
            <p className="text-base text-stone-700 mb-3 leading-relaxed">
              <span className="font-semibold">Origin:</span> {recipe.origin}
            </p>
          )}
          
          {recipe.story && (
            <p className="text-base text-stone-600 mt-5 italic leading-relaxed">
              &ldquo;{recipe.story}&rdquo;
            </p>
          )}
        </section>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <section className="bg-white rounded-3xl p-8 md:p-10 border border-stone-200 mb-10">
          <h2 className="text-2xl font-bold text-stone-800 mb-6 font-heading">Ingredients</h2>
          
          <ul className="space-y-4">
            {ingredients.map((ing, index) => (
              <li key={index} className="flex items-start gap-4 text-base leading-relaxed">
                <span className="w-2 h-2 bg-terracotta rounded-full flex-shrink-0 mt-2.5"></span>
                <span>
                  {ing.amount && <span className="font-semibold">{ing.amount} </span>}
                  {ing.unit && <span className="text-stone-600">{ing.unit} </span>}
                  <span className="text-stone-800">{ing.name}</span>
                  {ing.notes && <span className="text-stone-400"> ({ing.notes})</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Instructions */}
      {instructions.length > 0 && (
        <section className="bg-white rounded-3xl p-8 md:p-10 border border-stone-200 mb-10">
          <h2 className="text-2xl font-bold text-stone-800 mb-6 font-heading">How to Cook</h2>
          
          <ol className="space-y-8">
            {instructions.map((step) => (
              <li key={step.step} className="flex gap-5">
                <div className="w-10 h-10 bg-terracotta text-white rounded-full flex items-center justify-center font-bold text-base flex-shrink-0">
                  {step.step}
                </div>
                <p className="text-base text-stone-700 pt-2 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Version info */}
      {latestVersion && (
        <p className="text-center text-stone-400 text-sm mt-4 mb-8">
          Version {latestVersion.versionNumber} · Last updated {new Date(latestVersion.createdAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
