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
  readOnly?: boolean;
  variant?: "card" | "cover";
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
  readOnly = false,
  variant = "card",
}: RecipeTitleCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editingPlaceholder, setEditingPlaceholder] = useState(false);
  const showingSoftPlaceholder = isUntitled(title);

  useEffect(() => {
    if (!readOnly && autoFocusTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocusTitle, readOnly, showingSoftPlaceholder]);

  const inputValue = editingPlaceholder && showingSoftPlaceholder ? "" : title;

  if (variant === "cover") {
    return (
      <section className="min-w-0 text-white">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
            Recipe name
          </span>
          <SaveIndicator isSaving={isSaving} />
        </div>
        {readOnly ? (
          <h1 className="max-w-[34rem] text-3xl font-semibold leading-[0.98] tracking-normal text-white drop-shadow-sm sm:text-5xl">
            {title || UNTITLED_RECIPE}
          </h1>
        ) : (
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
            className="w-full max-w-[34rem] rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-3xl font-semibold leading-none tracking-normal text-white outline-none transition placeholder:text-white/45 hover:border-white/35 focus:border-white/55 focus:bg-black/35 focus:ring-4 focus:ring-white/15 sm:text-5xl"
          />
        )}
        <span className="sr-only">Last updated {formatDateTime(recipe.updatedAt)}</span>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#800020]/10 bg-[#fff8f4] px-4 py-4 shadow-sm ring-1 ring-white/70 sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#800020]/70">
          Recipe name
        </span>
        <SaveIndicator isSaving={isSaving} />
      </div>
      {readOnly ? (
        <div className="w-full rounded-xl border border-transparent bg-white/45 px-3 py-2 text-2xl font-semibold leading-tight text-[#1A1A1A] sm:text-3xl">
          {title || UNTITLED_RECIPE}
        </div>
      ) : (
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
          className="w-full rounded-xl border border-transparent bg-white/65 px-3 py-2 text-2xl font-semibold leading-tight text-[#1A1A1A] outline-none transition placeholder:text-[#800020]/35 hover:border-[#800020]/15 focus:border-[#800020]/35 focus:bg-white focus:ring-4 focus:ring-[#800020]/10 sm:text-3xl"
        />
      )}
      <span className="mt-2 block text-xs text-neutral-400">
        Last updated {formatDateTime(recipe.updatedAt)}
      </span>
    </section>
  );
}
