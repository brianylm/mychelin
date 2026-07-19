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
  // Optional "ingredient: X" hint shown under the title when this item
  // is a search hit matched on an ingredient name.
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

  const handlePointerEnter = () => {
    // Prefetch full recipe on hover so it's instant on click
    qc.prefetchQuery({
      queryKey: ["recipe", recipe.id],
      queryFn: () =>
        fetch(`/api/recipes/${recipe.id}`).then((r) => r.json()),
      staleTime: 30_000,
    });
  };

  const isDraft = recipe.status === "draft";

  return (
    <li
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 transition-colors",
        isSelected ? "bg-[#800020]/10 text-[#521224] ring-1 ring-[#800020]/10" : "hover:bg-[#800020]/5",
        isDraft && !isSelected && "opacity-70"
      )}
      onClick={() => onSelect(recipe.id)}
      onPointerEnter={handlePointerEnter}
    >
      {/* Thumbnail placeholder */}
      <div
        className={cn(
          "relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#800020]/10 to-[#f6f2eb] ring-1 ring-[#800020]/10",
          isDraft && "border border-dashed border-[#800020]/30 bg-[#800020]/5"
        )}
      >
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : isDraft ? (
          <PencilLine className="h-4 w-4 text-[#800020]/55" />
        ) : (
          <ChefHat className="h-4 w-4 text-[#800020]/55" />
        )}
      </div>

      {/* Name + cuisine (or matched ingredient context during search) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-sm",
            isSelected && "font-medium",
            isDraft && !isSelected && "italic text-neutral-600"
          )}
        >
          {recipe.title}
        </span>
        {matchedIngredient ? (
          <span className="truncate text-[11px] text-[#800020]">
            ingredient:{" "}
            <span className="font-medium">{matchedIngredient}</span>
          </span>
        ) : isDraft ? (
          <span className="truncate text-[11px] text-neutral-400">Draft</span>
        ) : (
          recipe.cuisine && (
            <span className="truncate text-xs text-neutral-500">
              {recipe.cuisine}
            </span>
          )
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {onCook && !isDraft && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCook(recipe.id);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#17131f] text-white opacity-100 transition hover:bg-[#800020] md:opacity-0 md:group-hover:opacity-100"
            aria-label={`Cook ${recipe.title}`}
            title="Cook with me"
          >
            <ChefHat className="h-3.5 w-3.5" />
          </button>
        )}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton
              variant="ghost"
              size="1"
              className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
              aria-label="Recipe options"
              onClick={(e) => e.stopPropagation()}
            >
              <DotsVerticalIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {onShare && !isDraft && (
              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation();
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(recipe.id);
                }}
              >
                <TrashIcon />
                Delete
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </li>
  );
}
