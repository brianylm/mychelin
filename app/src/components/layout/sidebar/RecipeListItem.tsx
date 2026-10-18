"use client";

import { Menu } from "@/components/ui/Menu";
import { ChefHat, MoreVertical, PencilLine, Share2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/db/schema";

interface RecipeListItemProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onShare?: (recipe: Recipe) => void;
  onDelete?: (id: number) => void;
  onCook?: (id: number) => void;
  matchedIngredient?: string | null;
  bookTitles?: string[];
}

export function RecipeListItem({
  recipe,
  isSelected,
  onSelect,
  onShare,
  onDelete,
  onCook,
  matchedIngredient,
  bookTitles = [],
}: RecipeListItemProps) {
  const qc = useQueryClient();

  const handlePointerEnter = () => {
    qc.prefetchQuery({
      queryKey: ["recipe", recipe.id],
      queryFn: () =>
        fetch(`/api/recipes/${recipe.id}`).then((response) => response.json()),
      staleTime: 30_000,
    });
  };

  const isDraft = recipe.status === "draft";
  const bookSubtitle = bookTitles.length > 0 ? `In ${bookTitles.join(" · ")}` : null;

  return (
    <li
      className={cn(
        "group flex min-w-0 items-center rounded-lg transition-colors duration-150",
        isSelected
          ? "bg-[var(--ui-accent-muted)] text-accent-dark"
          : "hover:bg-[var(--ui-surface-subtle)]",
        isDraft && !isSelected && "text-[var(--ui-muted)]"
      )}
      onPointerEnter={handlePointerEnter}
    >
      <button
        type="button"
        onClick={() => onSelect(recipe.id)}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left"
        aria-current={isSelected ? "page" : undefined}
      >
        <span
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-subtle)]",
            isDraft && "border-dashed border-[var(--ui-accent)]/30 bg-[var(--ui-accent-muted)]"
          )}
        >
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : isDraft ? (
            <PencilLine className="h-4 w-4 text-[var(--ui-accent)]/60" aria-hidden="true" />
          ) : (
            <ChefHat className="h-4 w-4 text-[var(--ui-accent)]/60" aria-hidden="true" />
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "truncate text-sm text-[var(--ui-text)]",
              isSelected && "font-semibold",
              isDraft && !isSelected && "italic"
            )}
          >
            {recipe.title}
          </span>
          {bookSubtitle && (
            <span className="line-clamp-2 break-words text-[11px] leading-4 text-[var(--ui-muted)]" title={bookSubtitle}>
              {bookSubtitle}
            </span>
          )}
          {matchedIngredient ? (
            <span className="truncate text-[11px] text-[var(--ui-accent)]">
              Ingredient: <span className="font-semibold">{matchedIngredient}</span>
            </span>
          ) : isDraft ? (
            <span className="truncate text-[11px] text-[var(--ui-muted)]">Draft</span>
          ) : recipe.cuisine ? (
            <span className="truncate text-xs text-[var(--ui-muted)]">{recipe.cuisine}</span>
          ) : null}
        </span>
      </button>

      <div className="flex shrink-0 items-center">
        {onCook && !isDraft && (
          <button
            type="button"
            onClick={() => onCook(recipe.id)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-[background-color,color,opacity] duration-150 hover:bg-[var(--ui-action)] hover:text-[var(--ui-action-text)] lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
            aria-label={`Cook ${recipe.title}`}
            title="Cook with me"
          >
            <ChefHat className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <Menu.Root>
          <Menu.Trigger>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors duration-150 hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
              aria-label={`Recipe options for ${recipe.title}`}
              title="Recipe options"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>
          </Menu.Trigger>
          <Menu.Content align="end">
            {onShare && !isDraft && (
              <Menu.Item onClick={() => onShare(recipe)}>
                <Share2 className="h-4 w-4" />
                Share
              </Menu.Item>
            )}
            {onDelete && (
              <Menu.Item tone="danger" onClick={() => onDelete(recipe.id)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Root>
      </div>
    </li>
  );
}
