"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MealPilotClientError,
  addFreshDish,
  addPreparedDish,
  createMealGroup,
  deleteMealGroup,
  listMealGroups,
  listPreparedBatches,
  mealPilotKeys,
  updateMealGroup,
} from "@/lib/meal-pilot/client";
import type { MealGroupView, MealType } from "@/lib/meal-pilot/types";
import type { MealComposerSubmission } from "./MealComposerDialog";

export type MealComposerState = {
  purpose: "create" | "add-dish" | "edit";
  date: string;
  mealType: MealType;
  meal: MealGroupView | null;
};

// Every mutation carries the revision the user was looking at; the server
// rejects stale writes (REVISION_CONFLICT) and over-allocation
// (INSUFFICIENT_PORTIONS). On either, reload so the next attempt is based on
// current state instead of retrying blindly.
function describeError(error: unknown): string {
  if (error instanceof MealPilotClientError) {
    if (error.code === "REVISION_CONFLICT") {
      return "This meal changed elsewhere. It has been reloaded — please try again.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

type DishSubmission = NonNullable<MealComposerSubmission["dish"]>;

export function useMealPilotPlanner({
  startDate,
  endDate,
  enabled,
  onPlansChanged,
}: {
  startDate: string;
  endDate: string;
  enabled: boolean;
  // Fresh dishes are meal_plans rows, so grouping or ungrouping changes the
  // planner's own plan list too.
  onPlansChanged: () => void;
}) {
  const qc = useQueryClient();
  const groupsQuery = useQuery({
    queryKey: mealPilotKeys.groups(startDate, endDate),
    queryFn: () => listMealGroups(startDate, endDate),
    enabled,
  });
  const batchesQuery = useQuery({
    queryKey: mealPilotKeys.preparedBatches,
    queryFn: listPreparedBatches,
    enabled,
  });

  const [composer, setComposer] = useState<MealComposerState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mealGroups = useMemo(
    () => groupsQuery.data?.mealGroups ?? [],
    [groupsQuery.data]
  );
  const batches = batchesQuery.data?.batches ?? [];

  const refresh = useCallback(async () => {
    onPlansChanged();
    // Everything meal-pilot: groups, ready meals and the next-meal card.
    await qc.invalidateQueries({ queryKey: ["meal-pilot"] });
  }, [qc, onPlansChanged]);

  const groupsForSlot = useCallback(
    (date: string, mealType: string) =>
      mealGroups.filter((group) => group.date === date && group.mealType === mealType),
    [mealGroups]
  );

  const openComposer = useCallback((state: MealComposerState) => {
    setError(null);
    setComposer(state);
  }, []);

  const closeComposer = useCallback(() => {
    if (busy) return;
    setError(null);
    setComposer(null);
  }, [busy]);

  const addDish = useCallback((meal: MealGroupView, dish: DishSubmission) => {
    if (dish.source === "fresh") {
      return addFreshDish(meal.id, {
        expectedRevision: meal.revision,
        recipeId: dish.recipeId,
        targetPortions: dish.targetPortions,
        plannedOutput: dish.plannedOutput,
      });
    }
    return addPreparedDish(meal.id, {
      expectedRevision: meal.revision,
      lotId: dish.lotId,
      portions: dish.portions,
      reheatNotes: dish.reheatNotes,
      idempotencyKey: dish.idempotencyKey,
    });
  }, []);

  const submitComposer = useCallback(
    async (value: MealComposerSubmission) => {
      if (!composer || busy) return;
      setBusy(true);
      setError(null);
      let created: MealGroupView | null = null;
      try {
        if (composer.purpose === "create") {
          // Recipes already planned in this slot join the new meal, so the
          // slot shows one meal instead of a meal plus loose dishes.
          created = (await createMealGroup({ ...value.schedule, adoptLegacySlot: true })).mealGroup;
          if (value.dish) await addDish(created, value.dish);
        } else if (composer.purpose === "add-dish" && composer.meal && value.dish) {
          await addDish(composer.meal, value.dish);
        } else if (composer.purpose === "edit" && composer.meal) {
          await updateMealGroup(composer.meal.id, {
            expectedRevision: composer.meal.revision,
            ...value.schedule,
          });
        }
        setComposer(null);
      } catch (err) {
        setError(describeError(err));
        // The meal exists even though its first dish failed (e.g. not enough
        // portions left). Retrying must add to that meal, not create another.
        if (created) {
          setComposer({ ...composer, purpose: "add-dish", meal: created });
        }
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [composer, busy, addDish, refresh]
  );

  const deleteMeal = useCallback(
    async (meal: MealGroupView): Promise<string | null> => {
      try {
        await deleteMealGroup(meal.id, meal.revision);
        return null;
      } catch (err) {
        return describeError(err);
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  return {
    loading: groupsQuery.isLoading,
    mealGroups,
    batches,
    groupsForSlot,
    composer,
    composerBusy: busy,
    composerError: error,
    openComposer,
    closeComposer,
    submitComposer,
    deleteMeal,
    refresh,
  };
}
