"use client";

export default function RecipeForm() {
  return (
    <form
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      onSubmit={(e) => e.preventDefault()}
    >
      <h2 className="mb-4 text-xl font-semibold">Add a Recipe</h2>

      <label className="mb-1 block text-sm font-medium" htmlFor="title">
        Title
      </label>
      <input
        id="title"
        type="text"
        placeholder="e.g. Grandma's Laksa"
        className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
      />

      <label className="mb-1 block text-sm font-medium" htmlFor="description">
        Description
      </label>
      <textarea
        id="description"
        rows={3}
        placeholder="A short description of your recipe…"
        className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
      />

      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Add Recipe
      </button>
    </form>
  );
}
