"use client";

import { EditableField } from "@/components/ui/EditableField";
import { Combobox } from "@/components/ui/Combobox";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

export const CUISINE_OPTIONS = [
  // Singapore dish styles
  { value: "Hokkien", label: "Hokkien", group: "Singapore dish styles" },
  { value: "Teochew", label: "Teochew", group: "Singapore dish styles" },
  { value: "Cantonese", label: "Cantonese", group: "Singapore dish styles" },
  { value: "Hakka", label: "Hakka", group: "Singapore dish styles" },
  { value: "Hainanese", label: "Hainanese", group: "Singapore dish styles" },
  { value: "Nyonya", label: "Nyonya / Peranakan", group: "Singapore dish styles" },
  { value: "Peranakan", label: "Peranakan", group: "Singapore dish styles" },
  { value: "Malay Kampung", label: "Malay Kampung", group: "Singapore dish styles" },
  { value: "Tamil", label: "Tamil", group: "Singapore dish styles" },
  { value: "Punjabi", label: "Punjabi", group: "Singapore dish styles" },
  { value: "Eurasian", label: "Eurasian", group: "Singapore dish styles" },
  // Asian
  { value: "Chinese", label: "Chinese", group: "Asian" },
  { value: "Malay", label: "Malay", group: "Asian" },
  { value: "Indian", label: "Indian", group: "Asian" },
  { value: "Japanese", label: "Japanese", group: "Asian" },
  { value: "Korean", label: "Korean", group: "Asian" },
  { value: "Thai", label: "Thai", group: "Asian" },
  { value: "Vietnamese", label: "Vietnamese", group: "Asian" },
  { value: "Indonesian", label: "Indonesian", group: "Asian" },
  { value: "Filipino", label: "Filipino", group: "Asian" },
  { value: "Burmese", label: "Burmese", group: "Asian" },
  // European
  { value: "Italian", label: "Italian", group: "European" },
  { value: "French", label: "French", group: "European" },
  { value: "Spanish", label: "Spanish", group: "European" },
  { value: "Greek", label: "Greek", group: "European" },
  { value: "Portuguese", label: "Portuguese", group: "European" },
  { value: "German", label: "German", group: "European" },
  { value: "British", label: "British", group: "European" },
  { value: "Scandinavian", label: "Scandinavian", group: "European" },
  { value: "Eastern European", label: "Eastern European", group: "European" },
  // Americas
  { value: "American", label: "American", group: "Americas" },
  { value: "Mexican", label: "Mexican", group: "Americas" },
  { value: "Brazilian", label: "Brazilian", group: "Americas" },
  { value: "Peruvian", label: "Peruvian", group: "Americas" },
  { value: "Caribbean", label: "Caribbean", group: "Americas" },
  // Middle East & Africa
  { value: "Middle Eastern", label: "Middle Eastern", group: "Middle East & Africa" },
  { value: "Turkish", label: "Turkish", group: "Middle East & Africa" },
  { value: "Lebanese", label: "Lebanese", group: "Middle East & Africa" },
  { value: "Mediterranean", label: "Mediterranean", group: "Middle East & Africa" },
  { value: "North African", label: "North African", group: "Middle East & Africa" },
  { value: "Ethiopian", label: "Ethiopian", group: "Middle East & Africa" },
  // Other
  { value: "Fusion", label: "Fusion", group: "Other" },
  { value: "Other", label: "Other", group: "Other" },
];

interface RecipeDetailsCardProps {
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
  onBlur: (field: "description" | "cuisine" | "prepTime" | "cookTime" | "yield", value?: string) => void;
  savingDescription: boolean;
  savingCuisine: boolean;
  savingPrepTime: boolean;
  savingCookTime: boolean;
  savingYield: boolean;
}

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10 focus:bg-white placeholder:text-neutral-400";

/**
 * The library-info tier of progressive disclosure: short browsing/search
 * metadata plus timing and yield. Family provenance stays in Heritage.
 */
export function RecipeDetailsCard({
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
  savingDescription,
  savingCuisine,
  savingPrepTime,
  savingCookTime,
  savingYield,
}: RecipeDetailsCardProps) {
  return (
    <div className="grid gap-4">
      <EditableField
        label="Quick summary"
        value={description}
        onChange={onDescriptionChange}
        placeholder="e.g. Peppery soy-braised pork belly with soft eggs"
        helpText="Shown on recipe cards and search. Keep family memories and provenance in Heritage."
        multiline
        rows={2}
        onBlur={() => onBlur("description")}
        isSaving={savingDescription}
      />

      <Combobox
        label="Cuisine / dish style"
        value={cuisine}
        options={CUISINE_OPTIONS}
        placeholder="Search or select dish style..."
        helpText="Use this for browsing and meal planning; dialect or spoken language belongs under Heritage."
        onChange={(val) => {
          onCuisineChange(val);
          onBlur("cuisine", val);
        }}
        isSaving={savingCuisine}
      />

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
    </div>
  );
}
