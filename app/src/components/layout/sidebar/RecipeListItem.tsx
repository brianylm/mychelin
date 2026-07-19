"use client";

import { DropdownMenu, IconButton } from "@radix-ui/themes";
import {
  DotsVerticalIcon,
  Share1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { ChefHat, PencilLine } from "lucide-react";
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
}

export function RecipeListItem({
  recipe,
  isSelected,
  onSelect,
  onShare,
  onDelete,
  onCook,
  matchedIngredient,
}: RecipeListItemProps) {
  const qc = useQueryClient();
  const isDraft = recipe.status === "draft";

  const handlePointerEnter = () => {
    qc.prefetchQuery({
      queryKey: ["recipe", recipe.id],
      queryFn: () =>
        fetch(`/api/recipes/${recipe.id}`).then((response) => response.json()),
      staleTime: 30_000,
    });
  };

  return (
    <li
      className={cn(
        "group flex min-h-16 items-center gap-1 border-l-2 py-1 pl-1 transition-colors duration-200",
        isSelected
          ? "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] text-[#521224]"
          : "border-transparent hover:bg-[var(--ui-surface-subtle)]",
        isDraft && !isSelected && "opacity-75"
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(recipe.id)}
        onPointerEnter={handlePointerEnter}
        aria-current={isSelected ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left"
      >
        <span
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--ui-surface-subtle)] ring-1 ring-[var(--ui-border)]",
            isDraft && "border border-dashed border-[var(--ui-accent)]/30"
          )}
        >
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
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
          {matchedIngredient ? (
            <span className="truncate text-[11px] text-[var(--ui-accent)]">
              Ingredient: <span className="font-medium">{matchedIngredient}</span>
            </span>
          ) : isDraft ? (
            <span className="truncate text-[11px] text-[var(--ui-muted)]">
              Draft
            </span>
          ) : (
            recipe.cuisine && (
              <span className="truncate text-xs text-[var(--ui-muted)]">
                {recipe.cuisine}
              </span>
            )
          )}
        </span>
      </button>

      <span className="flex shrink-0 items-center">
        {onCook && !isDraft && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCook(recipe.id);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--ui-muted-strong)] transition-colors duration-200 hover:bg-[var(--ui-action)] hover:text-[var(--ui-action-text)]"
            aria-label={`Cook ${recipe.title}`}
            title="Cook with me"
          >
            <ChefHat className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton
              variant="ghost"
              size="2"
              className="h-10 w-10 rounded-md"
              aria-label={`Options for ${recipe.title}`}
              onClick={(event) => event.stopPropagation()}
            >
              <DotsVerticalIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {onShare && !isDraft && (
              <DropdownMenu.Item
                onClick={(event) => {
                  event.stopPropagation();
                  onShare(recipe);
                }}
              >
                <Share1Icon />
                Share
              </DropdownMenu.Item>
            )}
            {onDelete && (
              <DropdownMenu.Item
                color="red"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(recipe.id);
                }}
              >
                <TrashIcon />
                Delete
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </span>
    </li>
  );
}
