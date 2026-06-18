"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Clock3, Globe2, ListChecks, Soup } from "lucide-react";

export interface CaptureReviewRecipe {
  title?: string;
  description?: string;
  ingredients?: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    notes?: string;
  }>;
  instructions?: Array<{
    stepNumber?: number;
    content: string;
    tip?: string;
  }>;
  yield?: string;
  prepTime?: string;
  cookTime?: string;
  cuisine?: string;
  origin?: string;
  dialect?: string;
  occasion?: string;
  familyMember?: string;
  story?: string;
}

interface RecipeCaptureReviewProps {
  recipe: CaptureReviewRecipe;
  sourceLabel?: string;
  saving?: boolean;
  saveLabel?: string;
  backLabel?: string;
  children?: ReactNode;
  onBack: () => void;
  onSave: () => void;
}

function formatIngredient(ingredient: NonNullable<CaptureReviewRecipe["ingredients"]>[number]) {
  const unit = ingredient.unit ?? undefined;
  const amount = [ingredient.quantity ?? undefined, unit]
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join(" ");
  return [amount, ingredient.name].filter(Boolean).join(" ");
}

export function RecipeCaptureReview({
  recipe,
  sourceLabel,
  saving = false,
  saveLabel = "Save recipe",
  backLabel = "Back to edit",
  children,
  onBack,
  onSave,
}: RecipeCaptureReviewProps) {
  const ingredients = recipe.ingredients ?? [];
  const instructions = recipe.instructions ?? [];
  const metadata = [
    recipe.cuisine,
    recipe.yield,
    recipe.prepTime ? recipe.prepTime + " min prep" : "",
    recipe.cookTime ? recipe.cookTime + " min cook" : "",
  ].filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-2xl border border-[#eadfce] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#800020]/10 text-[#800020]">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#800020]">
                Review before saving
              </p>
              <h3 className="mt-1 text-lg font-semibold leading-snug text-stone-950">
                {recipe.title || "Untitled recipe"}
              </h3>
              {sourceLabel && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                  <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {sourceLabel}
                </p>
              )}
              {recipe.description && (
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {recipe.description}
                </p>
              )}
            </div>
          </div>

          {metadata.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {metadata.map((item) => (
                <span key={item} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600">
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-[#eadfce] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <Soup className="h-4 w-4 text-[#800020]" aria-hidden="true" />
                Ingredients
              </div>
              <span className="rounded-full bg-[#800020]/10 px-2 py-0.5 text-xs font-semibold text-[#800020]">
                {ingredients.length}
              </span>
            </div>
            {ingredients.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-800">
                No ingredients were found. You can save and fill them in later.
              </p>
            ) : (
              <ul className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>
                      {formatIngredient(ingredient)}
                      {ingredient.notes ? <span className="text-stone-400"> ({ingredient.notes})</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[#eadfce] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <Clock3 className="h-4 w-4 text-[#800020]" aria-hidden="true" />
                Steps
              </div>
              <span className="rounded-full bg-[#800020]/10 px-2 py-0.5 text-xs font-semibold text-[#800020]">
                {instructions.length}
              </span>
            </div>
            {instructions.length === 0 ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm leading-6 text-red-700">
                No steps were found. Go back and add or paste the method before saving.
              </p>
            ) : (
              <ol className="space-y-2">
                {instructions.map((instruction, index) => (
                  <li key={index} className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-800">
                    <span className="mr-1 font-semibold text-[#800020]">
                      {instruction.stepNumber ?? index + 1}.
                    </span>
                    {instruction.content}
                    {instruction.tip ? (
                      <p className="mt-1 pl-5 text-xs leading-5 text-stone-500">
                        {instruction.tip}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[#eadfce] bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-10 rounded-full px-4 text-sm font-semibold text-stone-500 transition hover:bg-stone-50 hover:text-stone-800"
        >
          {backLabel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || instructions.length === 0}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-[#17131f] px-4 text-sm font-semibold text-white transition hover:bg-[#800020] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : saveLabel}
        </button>
      </div>
    </div>
  );
}
