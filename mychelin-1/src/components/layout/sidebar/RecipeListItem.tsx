"use client";

import { DropdownMenu, IconButton } from "@radix-ui/themes";
import {
  ArchiveIcon,
  DotsVerticalIcon,
  DrawingPinFilledIcon,
  DrawingPinIcon,
} from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/db/schema";

interface RecipeListItemProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onTogglePin?: (id: number) => void;
  onDelete?: (id: number) => void;
  // Optional "ingredient: X" hint shown under the title when this item
  // is a search hit matched on an ingredient name.
  matchedIngredient?: string | null;
}

export function RecipeListItem({
  recipe,
  isSelected,
  onSelect,
  onTogglePin,
  onDelete,
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

  return (
    <li
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors",
        isSelected ? "bg-amber-50" : "hover:bg-neutral-100"
      )}
      onClick={() => onSelect(recipe.id)}
      onPointerEnter={handlePointerEnter}
    >
      {/* Thumbnail placeholder */}
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-amber-50">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-base">🍳</span>
        )}
      </div>

      {/* Name + cuisine (or matched ingredient context during search) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn("truncate text-sm", isSelected && "font-medium")}
        >
          {recipe.title}
        </span>
        {matchedIngredient ? (
          <span className="truncate text-[11px] text-amber-700">
            ingredient:{" "}
            <span className="font-medium">{matchedIngredient}</span>
          </span>
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
            {onDelete && (
              <DropdownMenu.Item
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(recipe.id);
                }}
              >
                Delete
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </li>
  );
}
