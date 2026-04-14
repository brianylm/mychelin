"use client";

import { EditableField } from "@/components/ui/EditableField";
import { formatDateTime } from "@/lib/utils";
import type { Recipe } from "@/db/schema";

interface RecipeTitleCardProps {
  recipe: Recipe;
  title: string;
  onTitleChange: (title: string) => void;
  onBlur: () => void;
  isSaving: boolean;
  autoFocusTitle?: boolean;
}

/**
 * The "always visible" title card at the top of a recipe page. Deliberately
 * minimal so the empty-state feels light — everything else (description,
 * cuisine, timing, yield, etc.) is tucked into the collapsible Details
 * section below.
 */
export function RecipeTitleCard({
  recipe,
  title,
  onTitleChange,
  onBlur,
  isSaving,
  autoFocusTitle = false,
}: RecipeTitleCardProps) {
  return (
    <section className="grid gap-2 rounded-2xl border border-neutral-200 bg-white p-5">
      <EditableField
        label="Recipe name"
        value={title}
        onChange={onTitleChange}
        placeholder="e.g. Grandma's Laksa"
        onBlur={onBlur}
        isSaving={isSaving}
        autoFocusAndSelect={autoFocusTitle}
      />
      <span className="text-xs text-neutral-400">
        Last updated {formatDateTime(recipe.updatedAt)}
      </span>
    </section>
  );
}
