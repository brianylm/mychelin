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
      <section className="min-w-0 text-ui-action-text">
        <div className="mb-1 flex justify-end">
          <SaveIndicator isSaving={isSaving} />
        </div>
        {readOnly ? (
          <h1 className="max-w-[34rem] text-3xl font-semibold leading-[0.98] tracking-normal text-ui-action-text drop-shadow-sm sm:text-5xl">
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
            className="w-full max-w-[34rem] rounded-xl border border-ui-night-line bg-ui-scrim px-3 py-2 text-3xl font-semibold leading-none tracking-normal text-ui-action-text outline-none transition placeholder:text-ui-night-muted hover:border-ui-night-line focus:border-ui-highlight focus:bg-ui-night-raised focus:ring-4 focus:ring-ui-night-line sm:text-5xl"
          />
        )}
        <span className="sr-only">Last updated {formatDateTime(recipe.updatedAt)}</span>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-ui-border bg-ui-surface-raised px-4 py-4 ring-1 ring-ui-border sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-ui-accent">
          Recipe name
        </span>
        <SaveIndicator isSaving={isSaving} />
      </div>
      {readOnly ? (
        <div className="w-full rounded-xl border border-transparent bg-ui-surface-subtle px-3 py-2 text-2xl font-semibold leading-tight text-ui-text sm:text-3xl">
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
          className="w-full rounded-xl border border-transparent bg-ui-surface-subtle px-3 py-2 text-2xl font-semibold leading-tight text-ui-text outline-none transition placeholder:text-ui-accent hover:border-ui-border-strong focus:border-ui-accent focus:bg-ui-surface-raised focus:ring-4 focus:ring-ui-focus-soft sm:text-3xl"
        />
      )}
      <span className="mt-2 block text-xs text-ui-muted">
        Last updated {formatDateTime(recipe.updatedAt)}
      </span>
    </section>
  );
}
