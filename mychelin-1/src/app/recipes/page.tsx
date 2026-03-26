import RecipeForm from "@/components/RecipeForm";

const PLACEHOLDER_RECIPES = [
  {
    id: 1,
    title: "Hainanese Chicken Rice",
    description:
      "Fragrant poached chicken served over aromatic rice cooked in chicken stock, with chilli sauce and ginger paste on the side.",
    emoji: "🍗",
  },
  {
    id: 2,
    title: "Spaghetti Aglio e Olio",
    description:
      "A classic Italian pasta tossed in garlic-infused olive oil, red pepper flakes, and fresh parsley. Simple and delicious.",
    emoji: "🍝",
  },
  {
    id: 3,
    title: "Japanese Souffle Pancakes",
    description:
      "Fluffy, jiggly pancakes made with whipped egg whites, served with butter and maple syrup.",
    emoji: "🥞",
  },
];

export default function RecipesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        🍽️ My Recipes
      </h1>

      {/* Recipe list */}
      <section className="mb-12 space-y-4">
        {PLACEHOLDER_RECIPES.map((recipe) => (
          <div
            key={recipe.id}
            className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="text-4xl" role="img" aria-label={recipe.title}>
              {recipe.emoji}
            </span>
            <div>
              <h2 className="text-lg font-semibold">{recipe.title}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {recipe.description}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Add recipe form */}
      <RecipeForm />
    </main>
  );
}
