"use client";

import { EditableField } from "@/components/ui/EditableField";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { formatDateTime } from "@/lib/utils";
import type { Recipe } from "@/db/schema";

interface RecipeHeaderProps {
  recipe: Recipe;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
  cuisine: string;
  onCuisineChange: (cuisine: string) => void;
  prepTime: string;
  onPrepTimeChange: (prepTime: string) => void;
  cookTime: string;
  onCookTimeChange: (cookTime: string) => void;
  recipeYield: string;
  onYieldChange: (recipeYield: string) => void;
  onBlur: (field: "title" | "description" | "cuisine" | "prepTime" | "cookTime" | "yield") => void;
  savingTitle: boolean;
  savingDescription: boolean;
  savingCuisine: boolean;
  savingPrepTime: boolean;
  savingCookTime: boolean;
  savingYield: boolean;
}

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400";

export function RecipeHeader({
  recipe,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  cuisine,
  onCuisineChange,
  prepTime,
  onPrepTimeChange,
  cookTime,
  onCookTimeChange,
  recipeYield,
  onYieldChange,
  onBlur,
  savingTitle,
  savingDescription,
  savingCuisine,
  savingPrepTime,
  savingCookTime,
  savingYield,
}: RecipeHeaderProps) {
  return (
    <section className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
      <EditableField
        label="Recipe name"
        value={title}
        onChange={onTitleChange}
        placeholder="e.g. Grandma's Laksa"
        onBlur={() => onBlur("title")}
        isSaving={savingTitle}
      />

      <EditableField
        label="Description"
        value={description}
        onChange={onDescriptionChange}
        placeholder="Describe this recipe — its origins, memories, or special touches."
        multiline
        rows={3}
        onBlur={() => onBlur("description")}
        isSaving={savingDescription}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Cuisine
          </label>
          <SaveIndicator isSaving={savingCuisine} />
        </div>
        <select
          value={cuisine}
          onChange={(e) => {
            onCuisineChange(e.target.value);
            setTimeout(() => onBlur("cuisine"), 0);
          }}
          className={`${inputClass} ${!cuisine ? "text-neutral-400" : "text-neutral-900"}`}
        >
          <option value="">Select cuisine...</option>
          <optgroup label="Singapore Heritage">
            {["Hokkien", "Teochew", "Cantonese", "Hakka", "Hainanese", "Nyonya", "Peranakan", "Malay Kampung", "Tamil", "Punjabi", "Eurasian"].map(
              (c) => (
                <option key={c} value={c} className="text-neutral-900">
                  {c}
                </option>
              )
            )}
          </optgroup>
          <optgroup label="Regional">
            {["Chinese", "Malay", "Indian", "Western", "Japanese", "Korean", "Thai", "Vietnamese", "Indonesian", "Other"].map(
              (c) => (
                <option key={c} value={c} className="text-neutral-900">
                  {c}
                </option>
              )
            )}
          </optgroup>
        </select>
      </div>

      {/* Timing and Yield */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Prep (min)
            </label>
            <SaveIndicator isSaving={savingPrepTime} />
          </div>
          <input
            type="number"
            value={prepTime}
            onChange={(e) => onPrepTimeChange(e.target.value)}
            onBlur={() => onBlur("prepTime")}
            placeholder="15"
            min="0"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Cook (min)
            </label>
            <SaveIndicator isSaving={savingCookTime} />
          </div>
          <input
            type="number"
            value={cookTime}
            onChange={(e) => onCookTimeChange(e.target.value)}
            onBlur={() => onBlur("cookTime")}
            placeholder="30"
            min="0"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Yield
          </label>
          <SaveIndicator isSaving={savingYield} />
        </div>
        <input
          type="text"
          value={recipeYield}
          onChange={(e) => onYieldChange(e.target.value)}
          onBlur={() => onBlur("yield")}
          placeholder="e.g. 4 servings"
          className={inputClass}
        />
      </div>

      <span className="text-xs text-neutral-400">
        Last updated {formatDateTime(recipe.updatedAt)}
      </span>
    </section>
  );
}
