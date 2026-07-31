"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChefHat, Flame, Timer } from "lucide-react";
import type { RecipeWithRelations } from "@/store/RecipeStore";
import { HEAT_CONFIG } from "@/lib/instruction-heat";
import { buildCookingCardLayout } from "@/lib/cooking-card-layout";
import { recipeToMarkdown } from "@/lib/cooking-card-markdown";
import { CookingCardExport } from "./CookingCardExport";

interface CookingCardProps {
  recipe: RecipeWithRelations;
  // The recipe page's ingredientScale — identical math to the Recipe view.
  scale: number;
  onStartCooking: () => void;
}

function formatMinutes(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

// The Cooking Card: a read-only visual timeline of the recipe —
// scaled ingredient rail with mise-en-place checkboxes, step cards
// across the top, and a dot matrix aligning ingredients to the steps
// that use them. Layout/matching math lives in cooking-card-layout.
export function CookingCard({ recipe, scale, onStartCooking }: CookingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [checkedRows, setCheckedRows] = useState<Set<number>>(new Set());

  const layout = useMemo(
    () =>
      buildCookingCardLayout({
        ingredients: recipe.ingredients ?? [],
        instructions: recipe.instructions ?? [],
        scale,
      }),
    [recipe.ingredients, recipe.instructions, scale]
  );

  // Analytics: one view event per recipe open of the card. Fire-and-forget.
  useEffect(() => {
    void fetch("/api/usage-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: "cooking_card_viewed", recipeId: recipe.id }),
    }).catch(() => {});
  }, [recipe.id]);

  const markdown = useMemo(
    () =>
      recipeToMarkdown({
        title: recipe.title,
        cuisine: recipe.cuisine,
        servingsLine: recipe.yield ? `Serves ${recipe.yield}` : null,
        rows: layout.rows,
        steps: layout.steps,
      }),
    [recipe.title, recipe.cuisine, recipe.yield, layout]
  );

  const times: string[] = [
    formatMinutes(recipe.prepTime) ? `Prep ${formatMinutes(recipe.prepTime)}` : null,
    formatMinutes(recipe.cookTime) ? `Cook ${formatMinutes(recipe.cookTime)}` : null,
  ].filter((t): t is string => Boolean(t));

  const toggleRow = (index: number) => {
    setCheckedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (!layout.hasInstructions) {
    return (
      <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-6 text-center">
        <p className="text-sm text-ui-muted">
          Add steps to this recipe to see its cooking card.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border border-ui-border bg-ui-surface-raised p-4 shadow-sm"
    >
      {/* Meta strip */}
      {(recipe.cuisine || times.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-ui-muted">
          {recipe.cuisine && (
            <span className="rounded-full bg-ui-accent/10 px-2 py-0.5 font-semibold text-ui-accent">
              {recipe.cuisine}
            </span>
          )}
          {times.map((t) => (
            <span key={t} className="inline-flex items-center gap-1">
              <Timer className="h-3 w-3" aria-hidden="true" />
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Timeline grid: ingredient rows × step columns. Columns squeeze
          to a 96px floor and the grid grows to fit its tracks (w-fit) so
          the gap-lines render across the whole scrollable width; it
          scrolls only when the floor is hit. */}
      <div className="overflow-x-auto" role="region" aria-label="Cooking card timeline" tabIndex={0} data-export-expand>
        <div
          className="grid w-fit min-w-full gap-px rounded-xl bg-ui-border"
          style={{
            gridTemplateColumns: `minmax(88px, 120px) repeat(${layout.steps.length}, minmax(96px, 1fr))`,
          }}
        >
          {/* Header row: step cards */}
          <div className="sticky left-0 z-10 bg-ui-surface-raised p-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">
            Ingredients
          </div>
          {layout.steps.map((step) => (
            <div key={step.stepNumber} className="bg-ui-surface-raised p-2">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ui-accent text-[10px] font-bold text-white">
                  {step.stepNumber}
                </span>
                <span className="text-xs font-semibold leading-4 text-ui-text">
                  {step.title}
                </span>
              </div>
              {(step.heat || step.timerText) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {step.heat && HEAT_CONFIG[step.heat] && (
                    <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${HEAT_CONFIG[step.heat].className}`}>
                      <Flame className="h-2.5 w-2.5" aria-hidden="true" />
                      {HEAT_CONFIG[step.heat].shortLabel}
                    </span>
                  )}
                  {step.timerText && (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-ui-warning/25 bg-ui-warning-soft px-1.5 py-0.5 text-[9px] font-semibold text-ui-warning-text">
                      <Timer className="h-2.5 w-2.5" aria-hidden="true" />
                      {step.timerText}
                    </span>
                  )}
                </div>
              )}
              <p className="mt-1 text-[10px] leading-4 text-ui-muted">
                {step.text}
              </p>
            </div>
          ))}

          {/* Ingredient rows */}
          {layout.rows.map((row, rowIndex) => {
            const checked = checkedRows.has(rowIndex);
            return (
              <Fragment key={rowIndex}>
                <button
                  type="button"
                  onClick={() => toggleRow(rowIndex)}
                  aria-pressed={checked}
                  className={`sticky left-0 z-10 flex min-h-11 items-center gap-2 p-2 text-left transition-colors ${
                    checked ? "bg-ui-accent/5" : "bg-ui-surface-raised"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-ui-accent bg-ui-accent text-white"
                        : "border-ui-border-strong bg-ui-surface"
                    }`}
                    aria-hidden="true"
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-xs ${checked ? "text-ui-muted line-through" : "font-medium text-ui-text"}`}>
                      {row.name}
                    </span>
                    {row.amount && (
                      <span className="block truncate text-[10px] text-ui-muted">{row.amount}</span>
                    )}
                  </span>
                </button>
                {layout.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className={`flex items-center justify-center ${checked ? "bg-ui-accent/5" : "bg-ui-surface-raised"}`}
                  >
                    {step.matchedRowIndexes.includes(rowIndex) && (
                      <span className="h-2 w-2 rounded-full bg-ui-accent" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Footer: actions + watermark */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onStartCooking}
          data-export-hide
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ui-action px-4 text-sm font-semibold text-ui-action-text transition-colors hover:bg-ui-action-hover"
        >
          <ChefHat className="h-4 w-4" aria-hidden="true" />
          Start Cooking
        </button>
        <span data-export-hide className="contents">
          <CookingCardExport
            targetRef={cardRef}
            markdown={markdown}
            fileSlug={recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "recipe"}
            recipeId={recipe.id}
          />
        </span>
        <span className="ml-auto text-[9px] text-ui-muted/70">
          made with Mychelin · mychelin-sg.vercel.app
        </span>
      </div>
    </div>
  );
}