"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { createPreparedBatch, MealPilotClientError } from "@/lib/meal-pilot/client";
import { LEFTOVERS_EVENT, type LeftoversRequest } from "@/lib/leftovers-prompt";
import { PortionStepper, effectivePortions } from "./PortionStepper";

// A planned multi-dish meal records its own leftovers when it is
// confirmed, so only loose or unplanned cooks are asked here.
async function belongsToMealGroup(mealPlanId: number | null): Promise<boolean> {
  if (mealPlanId == null) return false;
  try {
    const res = await fetch(`/api/meal-plans/${mealPlanId}`);
    if (!res.ok) return false;
    const plan = (await res.json()) as { mealGroupId?: number | null };
    return plan.mealGroupId != null;
  } catch {
    return false;
  }
}

export function LeftoversPrompt() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const idPrefix = useId();
  const [queue, setQueue] = useState<LeftoversRequest[]>([]);
  const [total, setTotal] = useState("");
  const [freezer, setFreezer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = queue[0] ?? null;

  useEffect(() => {
    const onRequest = (event: Event) => {
      const request = (event as CustomEvent<LeftoversRequest>).detail;
      void belongsToMealGroup(request.mealPlanId).then((grouped) => {
        if (grouped) return;
        // A multi-dish cook asks about each dish in turn.
        setQueue((items) =>
          items.some((item) => item.recipeId === request.recipeId) ? items : [...items, request]
        );
      });
    };
    window.addEventListener(LEFTOVERS_EVENT, onRequest);
    return () => window.removeEventListener(LEFTOVERS_EVENT, onRequest);
  }, []);

  const next = useCallback(() => {
    setQueue((items) => items.slice(1));
    setTotal("");
    setFreezer("");
    setError(null);
  }, []);

  const totalPortions = Math.max(0, effectivePortions(total, 2));
  const freezerPortions = Math.min(Math.max(0, effectivePortions(freezer, 0)), totalPortions);
  const fridgePortions = totalPortions - freezerPortions;

  const save = async () => {
    if (!current || saving) return;
    if (totalPortions <= 0) {
      setError("Add at least one portion, or choose No leftovers.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPreparedBatch({
        title: current.title,
        recipeId: current.recipeId,
        cookedAt: new Date().toISOString(),
        notes: "Saved after cooking",
        lots: [
          ...(fridgePortions > 0 ? [{ storage: "fridge" as const, portions: fridgePortions }] : []),
          ...(freezerPortions > 0 ? [{ storage: "freezer" as const, portions: freezerPortions }] : []),
        ],
      });
      await qc.invalidateQueries({ queryKey: ["meal-pilot"] });
      addToast(`Saved ${totalPortions} portion${totalPortions === 1 ? "" : "s"} to Ready meals`, "success");
      next();
    } catch (err) {
      setError(err instanceof MealPilotClientError ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!current) return null;

  return (
    <Dialog
      open
      onClose={() => (saving ? undefined : next())}
      title={`Any leftovers of ${current.title}?`}
      subtitle="Save extra portions to Ready meals so you can plan them later."
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="min-h-11 flex-1" disabled={saving} onClick={next}>
            No leftovers
          </Button>
          <Button className="min-h-11 flex-1" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save to Ready meals"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <PortionStepper
          id={`${idPrefix}-total`}
          label="How many portions are left?"
          value={total}
          suggestion={2}
          min={1}
          max={100}
          disabled={saving}
          onChange={(value) => {
            setError(null);
            setTotal(value);
          }}
        />
        <PortionStepper
          id={`${idPrefix}-freezer`}
          label="Of these, in the freezer"
          value={freezer}
          suggestion={0}
          min={0}
          max={totalPortions}
          disabled={saving}
          onChange={(value) => {
            setError(null);
            setFreezer(value);
          }}
        />
        <p aria-live="polite" className="text-sm text-ui-muted">
          {fridgePortions} in the fridge · {freezerPortions} in the freezer
        </p>
        {error && (
          <p role="alert" className="text-sm text-ui-danger">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
