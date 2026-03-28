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
  onBlur: (field: "title" | "description" | "cuisine") => void;
  savingTitle: boolean;
  savingDescription: boolean;
  savingCuisine: boolean;
}

const CUISINE_OPTIONS = [
  // Existing generic
  "Chinese",
  "Malay",
  "Indian",
  "Peranakan",
  "Eurasian",
  "Western",
  "Japanese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Other",
  // Heritage regional
  "Hokkien",
  "Teochew",
  "Cantonese",
  "Hakka",
  "Hainanese",
  "Nyonya",
  "Tamil",
  "Punjabi",
  "Malay Kampung",
];

export function RecipeHeader({
  recipe,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  cuisine,
  onCuisineChange,
  onBlur,
  savingTitle,
  savingDescription,
  savingCuisine,
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
            // Auto-save on change
            setTimeout(() => onBlur("cuisine"), 0);
          }}
          className={`w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 ${!cuisine ? "text-neutral-400" : "text-neutral-900"}`}
        >
          <option value="">Select cuisine...</option>
          <optgroup label="Singapore Heritage">
            {["Hokkien", "Teochew", "Cantonese", "Hakka", "Hainanese", "Nyonya", "Peranakan", "Malay Kampung", "Tamil", "Punjabi", "Eurasian"].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              )
            )}
          </optgroup>
          <optgroup label="Regional">
            {["Chinese", "Malay", "Indian", "Western", "Japanese", "Korean", "Thai", "Vietnamese", "Indonesian", "Other"].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              )
            )}
          </optgroup>
        </select>
      </div>

      <span className="text-xs text-neutral-400">
        Last updated {formatDateTime(recipe.updatedAt)}
      </span>
    </section>
  );
}
