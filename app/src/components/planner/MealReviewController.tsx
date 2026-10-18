"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import {
  MealPilotClientError,
  confirmMeal,
  listMealReviews,
  mealPilotKeys,
} from "@/lib/meal-pilot/client";
import type { ConfirmMealRequest, MealGroupView } from "@/lib/meal-pilot/types";
import { MealAdjustmentForm } from "./MealAdjustmentForm";
import { MealReviewDialog } from "./MealReviewDialog";

// "Later" hides the review for the rest of this visit (tab session) only;
// the meals stay unconfirmed and their reservations stay in place.
const LATER_KEY = "mychelin.mealReview.later";

function readLater(): boolean {
  try {
    return sessionStorage.getItem(LATER_KEY) === "1";
  } catch {
    return false;
  }
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type ConfirmBody = Omit<ConfirmMealRequest, "idempotencyKey" | "expectedRevision">;

// Next-visit confirmation (work packet: "Confirmation on the next app
// visit"). Meals whose serving time has passed are listed once per visit.
// Only an explicit answer consumes stock; time passing never does.
export function MealReviewController({ enabled }: { enabled: boolean }) {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [later, setLater] = useState(readLater);
  const [before] = useState(() => new Date().toISOString());
  const [busyMealId, setBusyMealId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<MealGroupView | null>(null);
  // One idempotency key per meal + answer, reused if the same answer is
  // retried after a network failure, so the server applies it exactly once.
  const keys = useRef(new Map<string, string>());

  const reviewsQuery = useQuery({
    queryKey: mealPilotKeys.reviews(before),
    queryFn: () => listMealReviews(before),
    enabled: enabled && !later,
  });
  const reviews = reviewsQuery.data?.reviews ?? [];

  const refresh = useCallback(
    () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["meal-pilot"] }),
        qc.invalidateQueries({ queryKey: ["view"] }),
      ]),
    [qc]
  );

  const submit = useCallback(
    async (meal: MealGroupView, body: ConfirmBody) => {
      const keyId = `${meal.id}:${meal.revision}:${body.outcome}`;
      const idempotencyKey = keys.current.get(keyId) ?? newKey();
      keys.current.set(keyId, idempotencyKey);
      setBusyMealId(meal.id);
      setError(null);
      try {
        await confirmMeal(meal.id, { ...body, idempotencyKey, expectedRevision: meal.revision });
        keys.current.delete(keyId);
        setAdjusting(null);
        addToast(body.outcome === "skipped" ? "Marked as not eaten" : "Meal confirmed", "success");
      } catch (err) {
        if (err instanceof MealPilotClientError && err.code === "ALREADY_CONFIRMED") {
          // Someone else in the household answered first; nothing to do.
          keys.current.delete(keyId);
          setAdjusting(null);
        } else if (err instanceof MealPilotClientError && err.code === "REVISION_CONFLICT") {
          setError("This meal changed elsewhere. The list has been refreshed — please check it again.");
        } else {
          setError(err instanceof Error ? err.message : "Could not save. Please try again.");
        }
      } finally {
        setBusyMealId(null);
        await refresh();
      }
    },
    [addToast, refresh]
  );

  const handleLater = useCallback(() => {
    try {
      sessionStorage.setItem(LATER_KEY, "1");
    } catch {
      // Without storage, "Later" still holds until the next page load.
    }
    setLater(true);
  }, []);

  if (!enabled || later) return null;

  if (adjusting) {
    return (
      <Dialog
        open
        onClose={() => (busyMealId ? undefined : setAdjusting(null))}
        title="Adjust what happened"
        subtitle="Record who ate and how much, so your stock stays right."
      >
        <MealAdjustmentForm
          meal={adjusting}
          busy={busyMealId === adjusting.id}
          error={error}
          onCancel={() => {
            setError(null);
            setAdjusting(null);
          }}
          onSave={(body) => void submit(adjusting, body)}
        />
      </Dialog>
    );
  }

  return (
    <MealReviewDialog
      reviews={reviews}
      busyMealId={busyMealId}
      error={error}
      onAction={(meal, action) => {
        if (action === "adjust") {
          setError(null);
          setAdjusting(meal);
        } else {
          void submit(meal, { outcome: action });
        }
      }}
      onLater={handleLater}
    />
  );
}
