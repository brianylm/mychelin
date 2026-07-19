"use client";

import { Search, X } from "lucide-react";

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
    <div className="flex min-h-11 items-center gap-2">
      {isExpanded ? (
        <>
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--ui-muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search recipes or ingredients"
              className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] pl-9 pr-10 text-sm text-[var(--ui-text)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus-soft)]"
              autoFocus
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                if (query) onQueryChange("");
                else onExpandToggle(false);
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-1 flex h-9 w-9 items-center justify-center rounded-md text-[var(--ui-muted)] hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onQueryChange("");
              onExpandToggle(false);
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--ui-muted)] hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
            aria-label="Close search"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <h1 className="app-editorial-title min-w-0 flex-1 text-2xl leading-none text-[var(--ui-text)]">
            Library
          </h1>
          <button
            type="button"
            onClick={() => onExpandToggle(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted-strong)] hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-accent)]"
            aria-label="Search recipes"
            title="Search recipes"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted-strong)] hover:bg-[var(--ui-surface-subtle)] md:hidden"
            aria-label="Close navigation"
            title="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
