"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface SharedRecipe {
  id: number;
  title: string;
  description: string | null;
  cuisine: string | null;
  prepTime: number | null;
  cookTime: number | null;
  story: string | null;
  imageUrl: string | null;
  origin: string | null;
  dialect: string | null;
  occasion: string | null;
  familyMember: string | null;
  generation: string | null;
  ingredients: { name: string; quantity: number | null; unit: string | null; notes: string | null }[];
  instructions: { stepNumber: number; content: string; tip: string | null }[];
  photos: { blobUrl: string; sortOrder: number }[];
}

interface SharedBook {
  id: number;
  title: string;
  description: string | null;
  coverEmoji: string;
  coverColor: string;
  recipes: { id: number; title: string; cuisine: string | null; imageUrl: string | null; description: string | null }[];
}

type SharedData =
  | { type: "recipe"; permission: string; data: SharedRecipe }
  | { type: "book"; permission: string; data: SharedBook };

function RecipeDetail({ recipe, permission, onBack }: { recipe: SharedRecipe; permission: string; onBack?: () => void }) {
  const r = recipe;
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <img src="/icons/icon-96.png" alt="Mychelin" className="h-8 w-8 rounded-lg" />
          )}
          <span className="text-sm font-semibold text-neutral-800 truncate flex-1">
            {onBack ? r.title : "Mychelin"}
          </span>
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 shrink-0">
            {permission === "edit" ? "Collaborator" : "View only"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {/* Cover image */}
        {r.imageUrl && (
          <div className="mb-6 overflow-hidden rounded-2xl">
            <img src={r.imageUrl} alt={r.title} className="w-full h-56 object-cover" />
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-neutral-900">{r.title}</h1>
        {r.cuisine && (
          <span className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            {r.cuisine}
          </span>
        )}
        {r.description && (
          <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{r.description}</p>
        )}

        {/* Times */}
        {(r.prepTime || r.cookTime) && (
          <div className="mt-4 flex gap-4 text-sm text-neutral-500">
            {r.prepTime && <span>🔪 {r.prepTime}m prep</span>}
            {r.cookTime && <span>🔥 {r.cookTime}m cook</span>}
          </div>
        )}

        {/* Story */}
        {r.story && (
          <div className="mt-6 rounded-xl bg-amber-50/50 border border-amber-100 p-4">
            <h3 className="mb-2 text-sm font-semibold text-amber-800">Family Story</h3>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{r.story}</p>
          </div>
        )}

        {/* Cultural context */}
        {(r.origin || r.dialect || r.occasion || r.familyMember) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {r.origin && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">📍 {r.origin}</span>}
            {r.dialect && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">🗣 {r.dialect}</span>}
            {r.occasion && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">🎉 {r.occasion}</span>}
            {r.familyMember && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">👨‍👩‍👧 {r.familyMember}</span>}
          </div>
        )}

        {/* Ingredients */}
        {r.ingredients.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-neutral-800">Ingredients</h2>
            <ul className="space-y-2">
              {r.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg bg-white border border-neutral-100 p-3">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-amber-300" />
                  <div>
                    <span className="font-medium text-neutral-800">{ing.name}</span>
                    {(ing.quantity || ing.unit) && (
                      <span className="ml-2 text-sm text-neutral-500">
                        {ing.quantity}{ing.unit ? ` ${ing.unit}` : ""}
                      </span>
                    )}
                    {ing.notes && <p className="mt-0.5 text-xs text-neutral-400">{ing.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {r.instructions.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-neutral-800">Steps</h2>
            <ol className="space-y-4">
              {r.instructions.map((step) => (
                <li key={step.stepNumber} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                    {step.stepNumber}
                  </span>
                  <div>
                    <p className="text-sm text-neutral-700 leading-relaxed">{step.content}</p>
                    {step.tip && (
                      <p className="mt-1 text-xs text-amber-600 italic">💡 {step.tip}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Photos */}
        {r.photos.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-neutral-800">Photos</h2>
            <div className="grid grid-cols-2 gap-3">
              {r.photos.map((p, i) => (
                <img key={i} src={p.blobUrl} alt="" className="rounded-xl object-cover h-40 w-full" />
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 pb-8 text-center text-xs text-neutral-400">
          Shared via <a href="/" className="text-amber-600 hover:underline">Mychelin</a> — family recipe heritage
        </div>
      </div>
    </div>
  );
}

export default function SharedPage() {
  const params = useParams();
  const token = params.token as string;
  const [shared, setShared] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<SharedRecipe | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setShared)
      .catch(() => setError("This share link is invalid or has been removed."))
      .finally(() => setLoading(false));
  }, [token]);

  const openRecipe = useCallback(async (recipeId: number) => {
    setLoadingRecipe(true);
    try {
      const res = await fetch(`/api/share/${token}?recipeId=${recipeId}`);
      if (!res.ok) throw new Error("Failed to load recipe");
      const data = await res.json();
      setSelectedRecipe(data.data);
    } catch {
      // fallback — just stay on book view
    } finally {
      setLoadingRecipe(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !shared) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <span className="mb-4 text-5xl">🔗</span>
        <h1 className="text-xl font-semibold text-neutral-800">Link not found</h1>
        <p className="mt-2 text-sm text-neutral-500">{error}</p>
      </div>
    );
  }

  // Recipe detail view (either direct recipe share or drilled-in from book)
  if (shared.type === "recipe" || selectedRecipe) {
    const recipe = selectedRecipe || (shared.type === "recipe" ? shared.data : null);
    if (!recipe) return null;

    return (
      <RecipeDetail
        recipe={recipe}
        permission={shared.permission}
        onBack={selectedRecipe ? () => setSelectedRecipe(null) : undefined}
      />
    );
  }

  // Book view with clickable recipe cards
  const b = shared.data;
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <img src="/icons/icon-96.png" alt="Mychelin" className="h-8 w-8 rounded-lg" />
          <span className="text-sm font-semibold text-neutral-800">Mychelin</span>
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            {shared.permission === "edit" ? "Collaborator" : "View only"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-3xl">{b.coverEmoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{b.title}</h1>
            {b.description && <p className="text-sm text-neutral-500">{b.description}</p>}
            <p className="text-xs text-neutral-400 mt-1">{b.recipes.length} recipe{b.recipes.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Loading overlay */}
        {loadingRecipe && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        )}

        {!loadingRecipe && b.recipes.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-400">No recipes in this book yet</p>
        ) : !loadingRecipe && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {b.recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => openRecipe(recipe.id)}
                className="flex flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden text-left transition-all hover:border-amber-300 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl opacity-60">🍳</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-neutral-800">{recipe.title}</h3>
                  {recipe.cuisine && (
                    <span className="mt-1 inline-block text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-neutral-500">{recipe.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 pb-8 text-center text-xs text-neutral-400">
          Shared via <a href="/" className="text-amber-600 hover:underline">Mychelin</a> — family recipe heritage
        </div>
      </div>
    </div>
  );
}
