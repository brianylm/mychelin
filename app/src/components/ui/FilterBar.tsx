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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-muted" />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-ui-border-strong bg-ui-surface-raised pl-9 pr-3 text-sm text-ui-text outline-none transition placeholder:text-ui-muted focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
          autoFocus={autoFocus}
        />
      </div>

      {(filters.length > 0 || resultCount !== undefined) && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3">
          {filters.map((filter) => {
            const active = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => onFilterChange?.(filter.value)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2",
                  active
                    ? "border-ui-action bg-ui-action text-ui-action-text"
                    : "border-ui-border-strong bg-ui-surface-raised text-ui-muted hover:border-ui-border-strong hover:text-ui-accent"
                )}
              >
                {filter.label}
                {filter.count !== undefined && (
                  <span className="ml-1 text-[10px] opacity-75">{filter.count}</span>
                )}
              </button>
            );
          })}
          {resultCount !== undefined && (
            <span className="ml-auto whitespace-nowrap px-1 text-[11px] font-medium text-ui-muted">
              {resultCount} {resultLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
