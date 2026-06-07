import { cn } from "@/lib/utils";

interface RecipeResultRowProps {
  title: string;
  cuisine?: string | null;
  ingredients?: string[];
  lastCookedLabel?: string;
  secondaryLabel?: string | null;
  selected?: boolean;
  matchEvidence?: string | null;
  onSelect: () => void;
}

export function RecipeResultRow({
  title,
  cuisine,
  ingredients = [],
  lastCookedLabel,
  secondaryLabel,
  selected = false,
  matchEvidence,
  onSelect,
}: RecipeResultRowProps) {
  const ingredientPreview = ingredients.slice(0, 4);
  const remainingIngredients = Math.max(0, ingredients.length - ingredientPreview.length);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-2",
        selected
          ? "border-[var(--ui-accent)]/45 bg-[var(--ui-accent-muted)]"
          : "border-[var(--ui-border)] bg-[var(--ui-surface-raised)] hover:border-[var(--ui-border-strong)] hover:bg-[var(--ui-surface-subtle)]"
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ui-text)]">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {cuisine && (
              <span className="rounded-full bg-[var(--ui-surface-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--ui-muted)] ring-1 ring-[var(--ui-border)]">
                {cuisine}
              </span>
            )}
            {lastCookedLabel && (
              <span className="text-[11px] font-medium text-[var(--ui-muted)]">
                {lastCookedLabel}
              </span>
            )}
            {!lastCookedLabel && secondaryLabel && (
              <span className="text-[11px] font-medium text-[var(--ui-muted)]">
                {secondaryLabel}
              </span>
            )}
          </div>
          {matchEvidence && (
            <p className="mt-1 text-[11px] leading-4 text-[var(--ui-accent)]">
              {matchEvidence}
            </p>
          )}
        </div>
        <span
          className={cn(
            "mt-0.5 h-3 w-3 shrink-0 rounded-full border",
            selected ? "border-[var(--ui-action)] bg-[var(--ui-action)]" : "border-[var(--ui-border-strong)]"
          )}
          aria-hidden="true"
        />
      </div>

      {ingredientPreview.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ingredientPreview.map((ingredient) => (
            <span
              key={ingredient}
              className="rounded bg-[var(--ui-warning-soft)] px-1.5 py-0.5 text-[10px] text-[var(--ui-warning-text)]"
            >
              {ingredient}
            </span>
          ))}
          {remainingIngredients > 0 && (
            <span className="rounded bg-[var(--ui-surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--ui-muted)]">
              +{remainingIngredients}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
