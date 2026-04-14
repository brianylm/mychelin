"use client";

import { useState, useCallback } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { IngredientTypeahead } from "@/components/ui/IngredientTypeahead";
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
    data: {
      name: string;
      quantity?: number;
      unit?: string;
      approximate?: boolean;
      quantityText?: string;
      notes?: string;
    }
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
    approximate: false,
    quantityText: "",
  });
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleAdd = useCallback(async () => {
    if (!draft.name.trim()) return;
    await onAdd(recipeId, {
      name: draft.name.trim(),
      quantity:
        !draft.approximate && draft.quantity
          ? parseFloat(draft.quantity)
          : undefined,
      unit: !draft.approximate ? draft.unit || undefined : undefined,
      approximate: draft.approximate,
      quantityText: draft.approximate ? draft.quantityText.trim() : undefined,
    });
    setDraft({
      name: "",
      quantity: "",
      unit: "",
      approximate: false,
      quantityText: "",
    });
    // Keep adding mode open for quick entry
  }, [draft, onAdd, recipeId]);

  const handleFieldBlur = useCallback(
    async (
      ingredient: Ingredient,
      field: keyof Ingredient,
      value: string | number | boolean | null
    ) => {
      const current = ingredient[field];
      if (String(current ?? "") === String(value ?? "")) return;
      setSavingId(ingredient.id);
      try {
        await onUpdate(recipeId, ingredient.id, {
          [field]: value,
        } as Partial<Ingredient>);
      } finally {
        setSavingId(null);
      }
    },
    [onUpdate, recipeId]
  );

  const toggleApproximate = useCallback(
    async (ingredient: Ingredient) => {
      const next = !ingredient.approximate;
      setSavingId(ingredient.id);
      try {
        await onUpdate(recipeId, ingredient.id, { approximate: next });
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
              <div
                className={`grid flex-1 items-center gap-2 ${
                  ing.approximate
                    ? "grid-cols-[1fr_1.4fr]"
                    : "grid-cols-[1fr_auto_auto]"
                }`}
              >
                {/* Name first */}
                <input
                  defaultValue={ing.name}
                  onBlur={(e) =>
                    handleFieldBlur(ing, "name", e.target.value)
                  }
                  className="min-w-0 rounded border border-transparent bg-transparent px-1 text-sm outline-none transition hover:border-neutral-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                  placeholder="ingredient"
                />

                {ing.approximate ? (
                  /* Approximate: single free-text field */
                  <input
                    key={`qt-${ing.id}-${ing.quantityText ?? ""}`}
                    defaultValue={ing.quantityText ?? ""}
                    onBlur={(e) =>
                      handleFieldBlur(
                        ing,
                        "quantityText",
                        e.target.value || null
                      )
                    }
                    className="min-w-0 rounded border border-transparent bg-transparent px-1 text-sm italic text-neutral-700 outline-none transition hover:border-neutral-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                    placeholder="a handful, agak-agak, to taste"
                  />
                ) : (
                  <>
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
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              <SaveIndicator isSaving={savingId === ing.id} />

              {/* Toggle: precise ↔ approximate */}
              <IconButton
                variant="ghost"
                size="1"
                color={ing.approximate ? "amber" : "gray"}
                className="flex-shrink-0"
                onClick={() => toggleApproximate(ing)}
                aria-label={
                  ing.approximate
                    ? "Switch to precise quantity"
                    : "Switch to approximate quantity"
                }
                title={
                  ing.approximate
                    ? "Switch to precise quantity"
                    : "Switch to approximate quantity (agak-agak)"
                }
              >
                <span className="text-base font-semibold leading-none">≈</span>
              </IconButton>

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
          {/* Name first, full width — with typeahead */}
          <div className="mb-2">
            <IngredientTypeahead
              value={draft.name}
              onChange={(name) => setDraft((d) => ({ ...d, name }))}
              onSelectSuggestion={(s) => {
                // Pre-fill unit if the suggestion has one and the user
                // hasn't already set one. Skip the unit pre-fill when in
                // approximate mode since the unit field isn't shown.
                setDraft((d) => ({
                  ...d,
                  name: s.name,
                  unit: d.approximate ? d.unit : (d.unit || s.unit || ""),
                }));
              }}
              placeholder="Ingredient name"
              className={`w-full ${fieldBase}`}
              autoFocus
              onSubmit={handleAdd}
              onCancel={() => setIsAdding(false)}
            />
          </div>

          {draft.approximate ? (
            /* Approximate: free-text field */
            <input
              value={draft.quantityText}
              onChange={(e) =>
                setDraft((d) => ({ ...d, quantityText: e.target.value }))
              }
              placeholder="e.g. a handful, agak-agak, to taste"
              className={`mb-3 w-full italic ${fieldBase}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setIsAdding(false);
              }}
            />
          ) : (
            /* Precise: qty + unit side by side */
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
                  <option key={u} value={u} className="text-neutral-900">
                    {u}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Approximate toggle for the draft */}
          <button
            type="button"
            onClick={() =>
              setDraft((d) => ({ ...d, approximate: !d.approximate }))
            }
            className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              draft.approximate
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
            }`}
          >
            <span className="text-sm leading-none">≈</span>
            {draft.approximate ? "Approximate" : "Use approximate"}
          </button>

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
                setDraft({
                  name: "",
                  quantity: "",
                  unit: "",
                  approximate: false,
                  quantityText: "",
                });
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
