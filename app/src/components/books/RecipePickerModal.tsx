"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface Recipe {
  id: number;
  title: string;
  description: string | null;
  cuisine: string | null;
  imageUrl: string | null;
  prepTime: number | null;
  cookTime: number | null;
}

interface RecipePickerModalProps {
  bookId: number;
  bookTitle: string;
  excludeRecipeIds: number[];
  onClose: () => void;
  onRecipeAdded: (recipe: Recipe) => void;
}

export function RecipePickerModal({ 
  bookId, 
  bookTitle, 
  excludeRecipeIds, 
  onClose, 
  onRecipeAdded 
}: RecipePickerModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUserRecipes();
  }, []);

  const fetchUserRecipes = async () => {
    try {
      const response = await fetch("/api/recipes");
      if (!response.ok) throw new Error("Failed to fetch recipes");
      
      const allRecipes = await response.json();
      // Filter out recipes already in the book
      const availableRecipes = allRecipes.filter(
        (recipe: Recipe) => !excludeRecipeIds.includes(recipe.id)
      );
      setRecipes(availableRecipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      addToast("Failed to load your recipes", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeToggle = (recipeId: number) => {
    setSelectedRecipes(prev => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecipes.size === 0 || submitting) return;

    setSubmitting(true);
    const results = [];

    try {
      for (const recipeId of selectedRecipes) {
        try {
          const response = await fetch(`/api/books/${bookId}/recipes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ recipeId }),
          });

          if (response.ok) {
            const recipe = recipes.find(r => r.id === recipeId);
            if (recipe) {
              onRecipeAdded(recipe);
            }
            results.push({ recipeId, success: true });
          } else {
            results.push({ recipeId, success: false });
          }
        } catch (error) {
          results.push({ recipeId, success: false });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      if (successCount > 0) {
        addToast(`Added ${successCount} recipe${successCount > 1 ? 's' : ''} to ${bookTitle}!`, "success");
        onClose();
      } else {
        addToast("Failed to add recipes", "error");
      }
    } catch (error) {
      console.error("Error adding recipes to book:", error);
      addToast("Failed to add recipes to book", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 max-h-[80vh] flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Add Recipes</h2>
            <p className="text-sm text-neutral-600">Select recipes to add to "{bookTitle}"</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"></div>
          </div>
        ) : recipes.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-2 text-4xl">📝</div>
            <p className="text-neutral-600">No available recipes to add</p>
            <p className="text-sm text-neutral-500">All your recipes are already in this book</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-3 mb-6">
              {recipes.map((recipe) => (
                <label
                  key={recipe.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-transparent p-3 transition-all hover:bg-neutral-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecipes.has(recipe.id)}
                    onChange={() => handleRecipeToggle(recipe.id)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-neutral-900">{recipe.title}</div>
                    {recipe.description && (
                      <p className="mt-1 text-sm text-neutral-600 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                      {recipe.cuisine && <span>{recipe.cuisine}</span>}
                      {recipe.prepTime && <span>{recipe.prepTime}min prep</span>}
                      {recipe.cookTime && <span>{recipe.cookTime}min cook</span>}
                    </div>
                  </div>
                  {recipe.imageUrl && (
                    <img
                      src={recipe.imageUrl}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedRecipes.size === 0 || submitting}
                className="flex-1 rounded-xl bg-amber-600 px-4 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting 
                  ? "Adding..." 
                  : selectedRecipes.size === 0 
                  ? "Select Recipes" 
                  : `Add ${selectedRecipes.size} Recipe${selectedRecipes.size > 1 ? 's' : ''}`
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}