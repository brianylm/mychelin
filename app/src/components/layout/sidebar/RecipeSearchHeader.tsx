"use client";

import { IconButton, Tooltip } from "@radix-ui/themes";
import { Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";

interface RecipeSearchHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  isExpanded: boolean;
  onExpandToggle: (expanded: boolean) => void;
  onClose: () => void;
}

export function RecipeSearchHeader({
  query,
  onQueryChange,
  isExpanded,
  onExpandToggle,
  onClose,
}: RecipeSearchHeaderProps) {
  return (
    <div className="flex h-9 items-center gap-3">
      {isExpanded ? (
        <div className="flex flex-1 animate-fade-in items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5">
            <MagnifyingGlassIcon className="h-4 w-4 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search recipes..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  if (query) onQueryChange("");
                  else onExpandToggle(false);
                }
              }}
            />
            {query && (
              <IconButton
                size="1"
                variant="ghost"
                onClick={() => onQueryChange("")}
                aria-label="Clear search"
              >
                <Cross2Icon className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
          <IconButton
            variant="ghost"
            size="2"
            onClick={() => {
              onQueryChange("");
              onExpandToggle(false);
            }}
            aria-label="Close search"
          >
            <Cross2Icon className="h-5 w-5" />
          </IconButton>
        </div>
      ) : (
        <>
          <h1 className="flex-1 shrink-0 text-base font-semibold tracking-tight">
            Recipes
          </h1>
          <Tooltip content="Search">
            <IconButton
              variant="ghost"
              size="2"
              color="gray"
              onClick={() => onExpandToggle(true)}
              aria-label="Search recipes"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Close">
            <IconButton
              variant="ghost"
              size="2"
              className="rounded-full md:hidden"
              onClick={onClose}
              aria-label="Close panel"
            >
              <Cross2Icon className="h-5 w-5" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </div>
  );
}
