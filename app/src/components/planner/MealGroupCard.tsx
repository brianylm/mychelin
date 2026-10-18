"use client";

import {
  AlertTriangle,
  CalendarClock,
  ChefHat,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { MealSourceBadge } from "./MealSourceBadge";
import type { FreshMealDish, MealGroupView } from "@/lib/meal-pilot/types";

interface MealGroupCardProps {
  meal: MealGroupView;
  compact?: boolean;
  busy?: boolean;
  onAddDish: (meal: MealGroupView) => void;
  onEdit: (meal: MealGroupView) => void;
  onDelete: (meal: MealGroupView) => void;
  onCookFresh?: (dishes: FreshMealDish[]) => void;
}

function formatTime(instant: string, timezone: string) {
  const value = new Date(instant);
  if (Number.isNaN(value.getTime())) return "Time unavailable";
  return value.toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

function portionsLabel(value: number) {
  return `${value} portion${value === 1 ? "" : "s"}`;
}

export function MealGroupCard({
  meal,
  compact = false,
  busy,
  onAddDish,
  onEdit,
  onDelete,
  onCookFresh,
}: MealGroupCardProps) {
  const freshDishes = meal.dishes.filter(
    (dish): dish is FreshMealDish => dish.source === "fresh" && !dish.cookedAt
  );

  return (
    <article className="rounded-xl border border-ui-accent/15 bg-ui-surface-raised shadow-sm">
      <div className={compact ? "p-2.5" : "p-3.5"}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ui-text">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-ui-accent" aria-hidden="true" />
                Serve {formatTime(meal.serveAt, meal.timezone)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-ui-muted">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {meal.dinerCount} {meal.dinerCount === 1 ? "person" : "people"}
              </span>
            </div>
            {meal.timing.durationMinutes != null ? (
              <p className="text-[11px] text-ui-muted">
                Cooking block {meal.timing.durationMinutes} minutes, ending at serving time
              </p>
            ) : meal.dishes.length > 0 && meal.timing.missingTiming ? (
              <p className="inline-flex items-center gap-1 text-[11px] font-medium text-ui-warning">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Add missing recipe timing or set an override
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-ui-surface-subtle px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ui-muted">
            {meal.syncState === "synced" ? "Calendar synced" : meal.status}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {meal.dishes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ui-border px-3 py-3 text-xs text-ui-muted">
              No dishes yet. Add fresh cooking or allocate a prepared portion.
            </p>
          ) : (
            meal.dishes.map((dish) => (
              <div
                key={dish.source === "fresh" ? `fresh-${dish.mealPlanId}` : `prepared-${dish.reservationId}`}
                className="rounded-lg bg-ui-surface-subtle px-2.5 py-2"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ui-text">
                    {dish.title}
                  </span>
                  <MealSourceBadge source={dish.source} className="shrink-0" />
                </div>
                <p className="mt-1 text-[11px] text-ui-muted">
                  {dish.source === "fresh"
                    ? `${portionsLabel(dish.targetPortions)} to eat${
                        dish.plannedOutput
                          ? ` · save ${dish.plannedOutput.fridge} fridge, ${dish.plannedOutput.freezer} frozen`
                          : ""
                      }`
                    : `${portionsLabel(dish.plannedPortions)} reserved${
                        dish.reheatNotes ? ` · ${dish.reheatNotes}` : ""
                      }`}
                </p>
              </div>
            ))
          )}
        </div>

        {meal.conflicts.length > 0 && (
          <div className="mt-2 rounded-lg border border-ui-warning/25 bg-ui-warning-soft px-2.5 py-2 text-[11px] text-ui-text">
            {meal.conflicts[0].message}
            {meal.conflicts.length > 1 ? ` · ${meal.conflicts.length - 1} more` : ""}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {onCookFresh && freshDishes.length > 0 && (
            <button
              type="button"
              onClick={() => onCookFresh(freshDishes)}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-ui-action px-3 text-xs font-semibold text-ui-action-text transition hover:bg-ui-action-hover disabled:opacity-55"
            >
              <ChefHat className="h-4 w-4" aria-hidden="true" />
              {freshDishes.length > 1 ? "Cook together" : "Cook"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onAddDish(meal)}
            disabled={busy || meal.status !== "planned"}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-xs font-semibold text-ui-text transition hover:border-ui-accent/40 hover:bg-ui-accent-muted disabled:opacity-55"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add dish
          </button>
          <button
            type="button"
            onClick={() => onEdit(meal)}
            disabled={busy || meal.status !== "planned"}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-ui-muted transition hover:bg-ui-surface-subtle hover:text-ui-text disabled:opacity-55"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Meal details
          </button>
          <button
            type="button"
            onClick={() => onDelete(meal)}
            disabled={busy || meal.status !== "planned"}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-ui-danger transition hover:bg-ui-danger-soft disabled:opacity-55"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove meal
          </button>
        </div>
      </div>
    </article>
  );
}
