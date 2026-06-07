"use client";

import { useEffect, useRef, useState } from "react";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
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

const UNTITLED_RECIPE = "Untitled recipe";

function isUntitled(value: string): boolean {
  return value.trim().toLowerCase() === UNTITLED_RECIPE.toLowerCase();
}

export function RecipeTitleCard({
  recipe,
  title,
  onTitleChange,
  onBlur,
  isSaving,
  autoFocusTitle = false,
}: RecipeTitleCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editingPlaceholder, setEditingPlaceholder] = useState(false);
  const showingSoftPlaceholder = isUntitled(title);

  useEffect(() => {
    if (autoFocusTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocusTitle, showingSoftPlaceholder]);

  const inputValue = editingPlaceholder && showingSoftPlaceholder ? "" : title;

  return (
    <section className="rounded-2xl border border-[#800020]/10 bg-[#fff8f4] px-4 py-4 shadow-sm ring-1 ring-white/70 sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#800020]/70">
          Recipe name
        </span>
        <SaveIndicator isSaving={isSaving} />
      </div>
      <input
        ref={inputRef}
        value={inputValue}
        onFocus={() => {
          if (showingSoftPlaceholder) setEditingPlaceholder(true);
        }}
        onChange={(event) => {
          if (editingPlaceholder) setEditingPlaceholder(false);
          onTitleChange(event.target.value);
        }}
        onBlur={() => {
          setEditingPlaceholder(false);
          onBlur();
        }}
        placeholder={UNTITLED_RECIPE}
        className="app-editorial-title w-full rounded-xl border border-transparent bg-white/65 px-3 py-2 text-3xl leading-tight text-[#1A1A1A] outline-none transition placeholder:text-[#800020]/35 hover:border-[#800020]/15 focus:border-[#800020]/35 focus:bg-white focus:ring-4 focus:ring-[#800020]/10 sm:text-4xl"
      />
      <span className="mt-2 block text-xs text-neutral-400">
        Last updated {formatDateTime(recipe.updatedAt)}
      </span>
    </section>
  );
}
