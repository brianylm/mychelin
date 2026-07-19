import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface FilterBarProps {
  id: string;
  label: string;
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  resultCount?: number;
  resultLabel?: string;
  autoFocus?: boolean;
  className?: string;
}

export function FilterBar({
  id,
  label,
  query,
  onQueryChange,
  placeholder = "Search",
  filters = [],
  activeFilter,
  onFilterChange,
  resultCount,
  resultLabel = "results",
  autoFocus = false,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("grid gap-3", className)}>
      <div className="relative">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ui-muted)]"
          aria-hidden="true"
        />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] pl-9 pr-3 text-sm text-[var(--ui-text)] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus-soft)]"
          autoFocus={autoFocus}
        />
      </div>

      {(filters.length > 0 || resultCount !== undefined) && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => {
            const active = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => onFilterChange?.(filter.value)}
                className={cn(
                  "flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-[background-color,border-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-2",
                  active
                    ? "border-[var(--ui-action)] bg-[var(--ui-action)] text-[var(--ui-action-text)]"
                    : "border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] text-[var(--ui-muted)] hover:border-[var(--ui-accent)]/40 hover:text-[var(--ui-accent)]"
                )}
              >
                {filter.label}
                {filter.count !== undefined && (
                  <span className="ml-1 tabular-nums opacity-75">
                    {filter.count}
                  </span>
                )}
              </button>
            );
          })}
          {resultCount !== undefined && (
            <span className="ml-auto whitespace-nowrap px-1 text-xs font-medium tabular-nums text-[var(--ui-muted)]">
              {resultCount} {resultLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
