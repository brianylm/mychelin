"use client";

import { Alert, Button } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { MealSourceBadge } from "@/components/planner/MealSourceBadge";
import type {
  MealDishView,
  MealGroupView,
  MealReviewItem,
  MealType,
} from "@/lib/meal-pilot/types";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

interface MealReviewDialogProps {
  reviews: MealReviewItem[];
  busyMealId?: number | null;
  error?: string | null;
  onAction: (
    meal: MealGroupView,
    action: "as_planned" | "adjust" | "skipped"
  ) => void;
  onLater: () => void;
}

// Local serve time in the meal's own timezone; falls back to the raw value if
// the timezone or timestamp is malformed rather than throwing mid-render.
function formatServeAt(serveAt: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-SG", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(serveAt));
  } catch {
    return serveAt;
  }
}

function dishKey(dish: MealDishView): string {
  return dish.source === "fresh"
    ? `fresh:${dish.mealPlanId}`
    : `prepared:${dish.reservationId}`;
}

// Post-meal check-in: asks whether planned meals actually happened, one flat
// divided row per meal. The parent owns the confirm calls and busy/error state.
export function MealReviewDialog({
  reviews,
  busyMealId = null,
  error = null,
  onAction,
  onLater,
}: MealReviewDialogProps) {
  const busy = busyMealId !== null && busyMealId !== undefined;

  return (
    <Dialog
      open={reviews.length > 0}
      onClose={busy ? () => {} : onLater}
      title="Did you complete these meals?"
      subtitle="Confirm what you ate when you have a moment."
      footer={
        <Button
          variant="secondary"
          className="min-h-11 w-full"
          disabled={busy}
          onClick={onLater}
        >
          Later
        </Button>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <ul className="divide-y divide-ui-border">
          {reviews.map(({ mealGroup }) => {
            const mealBusy = busyMealId === mealGroup.id;

            return (
              <li
                key={mealGroup.id}
                aria-busy={mealBusy}
                className="space-y-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="min-w-0 text-sm font-semibold text-ui-text">
                    {MEAL_TYPE_LABELS[mealGroup.mealType]} ·{" "}
                    {formatServeAt(mealGroup.serveAt, mealGroup.timezone)}
                  </h3>
                  <span className="text-xs text-ui-muted">
                    {mealGroup.dinerCount}{" "}
                    {mealGroup.dinerCount === 1 ? "diner" : "diners"}
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {mealGroup.dishes.map((dish) => (
                    <li
                      key={dishKey(dish)}
                      className="flex min-w-0 items-start gap-2"
                    >
                      <span className="min-w-0 flex-1 break-words text-sm text-ui-text">
                        {dish.title}
                      </span>
                      {dish.source !== "fresh" && (
                        <span className="shrink-0 text-xs text-ui-muted">
                          {dish.plannedPortions}{" "}
                          {dish.plannedPortions === 1 ? "portion" : "portions"}
                        </span>
                      )}
                      <MealSourceBadge
                        source={dish.source}
                        className="shrink-0"
                      />
                    </li>
                  ))}
                </ul>

                {mealBusy && (
                  <p className="text-xs font-medium text-ui-muted">Saving…</p>
                )}

                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => onAction(mealGroup, "as_planned")}
                  >
                    Yes, as planned
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => onAction(mealGroup, "adjust")}
                  >
                    Adjust
                  </Button>
                  <Button
                    variant="tertiary"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => onAction(mealGroup, "skipped")}
                  >
                    Did not have this meal
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
