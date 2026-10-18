"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { PreparedBatchForm } from "@/components/planner/PreparedBatchForm";
import { PreparedBatchList } from "@/components/planner/PreparedBatchList";
import {
  MealPilotClientError,
  createPreparedBatch,
  listPreparedBatches,
  mealPilotKeys,
} from "@/lib/meal-pilot/client";
import type { CreatePreparedBatchRequest } from "@/lib/meal-pilot/types";

type RecipeOption = { id: number; title: string };

async function listRecipeOptions(): Promise<RecipeOption[]> {
  const res = await fetch("/api/recipes?planner=1");
  if (!res.ok) return [];
  const list = (await res.json()) as RecipeOption[];
  return list.map(({ id, title }) => ({ id, title }));
}

// Food that is already cooked (work packet: "Entering prepared food").
// Adding it never deducts raw Pantry ingredients; the meal planner reserves
// portions from it and meal confirmation consumes them.
export function ReadyMealsSection() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const batchesQuery = useQuery({
    queryKey: mealPilotKeys.preparedBatches,
    queryFn: listPreparedBatches,
  });
  const recipesQuery = useQuery({
    queryKey: ["meal-pilot", "recipe-options"],
    queryFn: listRecipeOptions,
    enabled: adding,
  });

  const save = async (input: CreatePreparedBatchRequest) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await createPreparedBatch(input);
      await qc.invalidateQueries({ queryKey: ["meal-pilot"] });
      setAdding(false);
      addToast("Ready meal added", "success");
    } catch (err) {
      setError(
        err instanceof MealPilotClientError ? err.message : "Could not save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PreparedBatchList
        batches={batchesQuery.data?.batches ?? []}
        loading={batchesQuery.isLoading}
        onAdd={() => {
          setError(null);
          setAdding(true);
        }}
      />
      <Dialog
        open={adding}
        onClose={() => (saving ? undefined : setAdding(false))}
        title="Add cooked food"
        subtitle="Food that's already made, split between fridge and freezer."
      >
        <PreparedBatchForm
          onSave={(input) => void save(input)}
          onCancel={() => setAdding(false)}
          saving={saving}
          error={error}
          recipes={recipesQuery.data ?? []}
        />
      </Dialog>
    </>
  );
}
