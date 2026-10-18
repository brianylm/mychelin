"use client";

import { Plus } from "lucide-react";
import { MealSourceBadge } from "./MealSourceBadge";
import type { PreparedBatchView } from "@/lib/meal-pilot/types";

export interface PreparedBatchListProps {
  batches: PreparedBatchView[];
  loading?: boolean;
  onAdd: () => void;
}

function formatShortDate(value: string) {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function AddCookedFoodButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-xs font-semibold text-ui-text transition hover:border-ui-accent/40 hover:bg-ui-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add cooked food
    </button>
  );
}

export function PreparedBatchList({
  batches,
  loading = false,
  onAdd,
}: PreparedBatchListProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ui-text">Ready meals</h2>
        <AddCookedFoodButton onAdd={onAdd} />
      </div>

      {loading ? (
        <ul
          aria-label="Loading ready meals"
          aria-busy="true"
          className="space-y-2"
        >
          {[0, 1].map((row) => (
            <li
              key={row}
              aria-hidden="true"
              className="h-20 animate-pulse rounded-lg bg-[var(--ui-surface-subtle)]"
            />
          ))}
        </ul>
      ) : batches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ui-border bg-ui-surface-raised px-3 py-3 text-xs leading-5 text-ui-muted">
          No ready meals yet. Add food you&apos;ve already cooked, like a batch
          of curry in the freezer, so you can plan it into meals.
        </p>
      ) : (
        <ul className="space-y-2">
          {batches.map((batch) => {
            const hasPortions = batch.totalPhysicalPortions > 0;

            return (
              <li key={batch.id}>
                <article
                  className={`rounded-xl border border-ui-border bg-ui-surface-raised p-3.5 ${
                    hasPortions ? "text-ui-text" : "text-ui-muted"
                  }`}
                >
                  <h3 className="text-sm font-semibold">{batch.title}</h3>
                  {batch.cookedAt ? (
                    <p className="mt-1 text-xs text-ui-muted">
                      Cooked {formatShortDate(batch.cookedAt)}
                    </p>
                  ) : null}

                  {batch.lots.length > 0 ? (
                    <ul
                      aria-label={`Portions for ${batch.title}`}
                      className="mt-2 space-y-1.5"
                    >
                      {batch.lots.map((lot) => (
                        <li
                          key={lot.id}
                          className="rounded-lg bg-ui-surface-subtle px-2.5 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <MealSourceBadge
                              source={
                                lot.storage === "fridge" ? "fridge" : "frozen"
                              }
                              className="shrink-0"
                            />
                            <span className="text-xs text-ui-muted">
                              {lot.physicalPortions} portions ·{" "}
                              {lot.reservedPortions} planned ·{" "}
                              {lot.unallocatedPortions} free
                            </span>
                            {lot.useByDate ? (
                              <span className="text-xs text-ui-muted">
                                Use by {formatShortDate(lot.useByDate)}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
