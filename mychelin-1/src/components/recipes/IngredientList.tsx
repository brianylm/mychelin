"use client";

import { useState, useCallback } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import type { Ingredient } from "@/db/schema";
import { formatScaledQuantity } from "./ServingScaler";

const UNIT_OPTIONS = [
  "",
  "g",
  "kg",
  "ml",
  "L",
  "tsp",
  "tbsp",
  "cup",
  "pcs",
  "slice",
  "clove",
  "sprig",
  "pinch",
  "handful",
  "bunch",
  "can",
  "packet",
  "block",
  "stalk",
];

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
  scale?: number;
}

const fieldBase =
  "rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-sm outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400";

export function IngredientList({
  ingredients,
  recipeId,
  onAdd,
  onUpdate,
  onDelete,
  scale = 1,
}: IngredientListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    quantity: "",
    unit: "",
  });
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleAdd = useCallback(async () => {
    if (!draft.name.trim()) return;
    await onAdd(recipeId, {
      name: draft.name.trim(),
      quantity: draft.quantity ? parseFloat(draft.quantity) : undefined,
      unit: draft.unit || undefined,
    });
    setDraft({ name: "", quantity: "", unit: "" });
    // Keep adding mode open for quick entry
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
              <div className="grid flex-1 grid-cols-[1fr_auto_auto] items-center gap-2">
                {/* Name first */}
                <input
                  defaultValue={ing.name}
                  onBlur={(e) =>
                    handleFieldBlur(ing, "name", e.target.value)
                  }
                  className="min-w-0 rounded border border-transparent bg-transparent px-1 text-sm outline-none transition hover:border-neutral-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                  placeholder="ingredient"
                />
                {/* Qty */}
                {scale !== 1 && ing.quantity ? (
                  <span className="w-14 px-1 text-center text-sm tabular-nums text-amber-700 font-medium">
                    {formatScaledQuantity(ing.quantity, scale)}
                  </span>
                ) : (
                  <input
                    defaultValue={ing.quantity ?? ""}
                    onBlur={(e) =>
                      handleFieldBlur(
                        ing,
                        "quantity",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    className="w-14 rounded border border-transparent bg-transparent px-1 text-center text-sm tabular-nums outline-none transition hover:border-neutral-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                    placeholder="qty"
                  />
                )}
                {/* Unit dropdown */}
                <select
                  defaultValue={ing.unit ?? ""}
                  onChange={(e) =>
                    handleFieldBlur(ing, "unit", e.target.value || null)
                  }
                  className="w-[70px] rounded border border-transparent bg-transparent px-1 text-xs text-neutral-600 outline-none transition hover:border-neutral-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                >
                  <option value="">unit</option>
                  {UNIT_OPTIONS.filter(Boolean).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <SaveIndicator isSaving={savingId === ing.id} />

              <IconButton
                variant="ghost"
                size="1"
                color="red"
                className="flex-shrink-0 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
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
          {/* Name first, full width */}
          <input
            value={draft.name}
            onChange={(e) =>
              setDraft((d) => ({ ...d, name: e.target.value }))
            }
            placeholder="Ingredient name"
            className={`mb-2 w-full ${fieldBase}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setIsAdding(false);
            }}
          />
          {/* Qty + Unit side by side */}
          <div className="mb-3 flex gap-2">
            <input
              value={draft.quantity}
              onChange={(e) =>
                setDraft((d) => ({ ...d, quantity: e.target.value }))
              }
              placeholder="Qty"
              type="number"
              min="0"
              step="any"
              className={`w-20 ${fieldBase}`}
            />
            <select
              value={draft.unit}
              onChange={(e) =>
                setDraft((d) => ({ ...d, unit: e.target.value }))
              }
              className={`flex-1 ${fieldBase} ${!draft.unit ? "text-neutral-400" : "text-neutral-900"}`}
            >
              <option value="">Select unit...</option>
              {UNIT_OPTIONS.filter(Boolean).map((u) => (
                <option key={u} value={u} className="text-neutral-900">{u}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="1" variant="solid" onClick={handleAdd}>
              Add
            </Button>
            <Button
              size="1"
              variant="soft"
              color="gray"
              onClick={() => {
                setIsAdding(false);
                setDraft({ name: "", quantity: "", unit: "" });
              }}
            >
              Done
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
          {ingredients.length === 0 ? "Add ingredients" : "Add ingredient"}
        </Button>
      )}
    </section>
  );
}
