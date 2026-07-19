"use client";

import { Search, X } from "lucide-react";

interface RecipeSearchHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  isExpanded: boolean;
  onExpandToggle: (expanded: boolean) => void;
  onClose: () => void;
}

const iconButtonClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--ui-muted)] transition-colors duration-150 hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]";

export function RecipeSearchHeader({
  query,
  onQueryChange,
  isExpanded,
  onExpandToggle,
  onClose,
}: RecipeSearchHeaderProps) {
  return (
    <div className="flex min-h-11 items-center gap-2">
      {isExpanded ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] pl-3 focus-within:border-[var(--ui-accent)]">
            <Search className="h-4 w-4 shrink-0 text-[var(--ui-muted)]" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search recipes..."
              aria-label="Search recipes by title or ingredient"
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-neutral-400"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  if (query) onQueryChange("");
                  else onExpandToggle(false);
                }
              }}
            />
            {query && (
              <button
                type="button"
                className={iconButtonClass}
                onClick={() => onQueryChange("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            type="button"
            className={iconButtonClass}
            onClick={() => {
              onQueryChange("");
              onExpandToggle(false);
            }}
            aria-label="Close search"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <h1 className="app-editorial-title min-w-0 flex-1 truncate text-2xl leading-none text-[var(--ui-text)]">
            Library
          </h1>
          <button
            type="button"
            className={iconButtonClass}
            onClick={() => onExpandToggle(true)}
            aria-label="Search recipes"
            title="Search recipes"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${iconButtonClass} md:hidden`}
            onClick={onClose}
            aria-label="Close library panel"
            title="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
