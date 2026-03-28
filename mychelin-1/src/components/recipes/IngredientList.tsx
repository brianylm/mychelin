"use client";

import { useState, useCallback } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import type { Ingredient } from "@/db/schema";

interface IngredientListProps {
  ingredients: Ingredient[];
  recipeId: number;
  onAdd: (
    recipeId: number,
    data: { name: string; quantity?: number; unit?: string; notes?: string }
  ) => Promise<void>;
  onUpdate: (
    recipeId: number,
    ingredientId: number,
    data: Partial<Ingredient>
  ) => Promise<void>;
  onDelete: (recipeId: number, ingredientId: number) => Promise<void>;
}

export function IngredientList({
  ingredients,
  recipeId,
  onAdd,
  onUpdate,
  onDelete,
}: IngredientListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    quantity: "",
    unit: "",
    notes: "",
  });
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleAdd = useCallback(async () => {
    if (!draft.name.trim()) return;
    await onAdd(recipeId, {
      name: draft.name.trim(),
      quantity: draft.quantity ? parseFloat(draft.quantity) : undefined,
      unit: draft.unit || undefined,
      notes: draft.notes || undefined,
    });
    setDraft({ name: "", quantity: "", unit: "", notes: "" });
    setIsAdding(false);
  }, [draft, onAdd, recipeId]);

  const handleFieldBlur = useCallback(
    async (
      ingredient: Ingredient,
      field: keyof Ingredient,
      value: string | number | null
    ) => {
      const current = ingredient[field];
      if (String(current ?? "") === String(value ?? "")) return;
      setSavingId(ingredient.id);
      try {
        await onUpdate(recipeId, ingredient.id, { [field]: value } as Partial<Ingredient>);
      } finally {
        setSavingId(null);
      }
    },
    [onUpdate, recipeId]
  );

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">Ingredients</h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-700">
          {ingredients.length}
        </span>
      </div>

      {ingredients.length > 0 && (
        <ul className="mb-3 space-y-2">
          {ingredients.map((ing) => (
            <li
              key={ing.id}
              className="group flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2"
            >
              <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
                {/* Quantity */}
                <input
                  defaultValue={ing.quantity ?? ""}
                  onBlur={(e) =>
                    handleFieldBlur(
                      ing,
                      "quantity",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-14 rounded border border-transparent bg-transparent px-1 text-sm font-medium tabular-nums outline-none transition hover:border-neutral-200 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200"
                  placeholder="qty"
                />
                {/* Unit */}
                <input
                  defaultValue={ing.unit ?? ""}
                  onBlur={(e) =>
                    handleFieldBlur(ing, "unit", e.target.value || null)
                  }
                  className="w-12 rounded border border-transparent bg-transparent px-1 text-xs text-neutral-500 outline-none transition hover:border-neutral-200 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200"
                  placeholder="unit"
                />
                {/* Name */}
                <input
                  defaultValue={ing.name}
                  onBlur={(e) =>
                    handleFieldBlur(ing, "name", e.target.value)
                  }
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm outline-none transition hover:border-neutral-200 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200"
                  placeholder="ingredient name"
                />
              </div>

              <SaveIndicator isSaving={savingId === ing.id} />

              <IconButton
                variant="ghost"
                size="1"
                color="red"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onDelete(recipeId, ing.id)}
                aria-label="Remove ingredient"
              >
                <Cross2Icon />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {isAdding ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="mb-2 flex gap-2">
            <input
              value={draft.quantity}
              onChange={(e) =>
                setDraft((d) => ({ ...d, quantity: e.target.value }))
              }
              placeholder="Qty"
              className="w-16 rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 focus:bg-white"
              autoFocus
            />
            <input
              value={draft.unit}
              onChange={(e) =>
                setDraft((d) => ({ ...d, unit: e.target.value }))
              }
              placeholder="Unit"
              className="w-16 rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 focus:bg-white"
            />
            <input
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="Ingredient name"
              className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 focus:bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setIsAdding(false);
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button size="1" variant="solid" onClick={handleAdd}>
              Add
            </Button>
            <Button
              size="1"
              variant="soft"
              color="gray"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="2"
          variant="soft"
          className="w-full"
          onClick={() => setIsAdding(true)}
        >
          <PlusIcon className="mr-1 h-4 w-4" />
          Add ingredient
        </Button>
      )}
    </section>
  );
}
