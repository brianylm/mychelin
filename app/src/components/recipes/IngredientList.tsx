"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { ClipboardList, Trash2 } from "lucide-react";
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
  readOnly?: boolean;
}

const fieldBase =
  "rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-sm outline-none transition focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10 focus:bg-white placeholder:text-neutral-400";

type IngredientDraft = {
  name: string;
  quantity?: number;
  unit?: string;
  approximate?: boolean;
  quantityText?: string;
  notes?: string;
};

const UNIT_ALIASES = new Map([
  ["grams", "g"],
  ["gram", "g"],
  ["kilograms", "kg"],
  ["kilogram", "kg"],
  ["litre", "L"],
  ["litres", "L"],
  ["liter", "L"],
  ["liters", "L"],
  ["teaspoon", "tsp"],
  ["teaspoons", "tsp"],
  ["tablespoon", "tbsp"],
  ["tablespoons", "tbsp"],
  ["cups", "cup"],
  ["pieces", "pcs"],
  ["piece", "pcs"],
  ["cloves", "clove"],
  ["slices", "slice"],
  ["sprigs", "sprig"],
  ["stalks", "stalk"],
  ["cans", "can"],
  ["packets", "packet"],
  ["blocks", "block"],
  ["bunches", "bunch"],
]);

const UNIT_SET = new Set(UNIT_OPTIONS.filter(Boolean).map((u) => u.toLowerCase()));

function normalizeUnit(token: string): string | undefined {
  const clean = token.toLowerCase().replace(/[.,]$/, "");
  if (UNIT_SET.has(clean)) {
    return UNIT_OPTIONS.find((u) => u.toLowerCase() === clean);
  }
  return UNIT_ALIASES.get(clean);
}

function parseNumberToken(token: string): number | null {
  const clean = token.replace(/,/g, "").trim();
  if (/^\d+(?:\.\d+)?$/.test(clean)) return Number(clean);
  const fraction = clean.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator !== 0) return Number(fraction[1]) / denominator;
  }
  return null;
}

function parseQuantityUnitToken(token: string): {
  quantity: number;
  unit?: string;
} | null {
  const compact = token.match(/^(\d+(?:\.\d+)?|\d+\/\d+)([a-zA-Z]+)$/);
  if (compact) {
    const quantity = parseNumberToken(compact[1]);
    const unit = normalizeUnit(compact[2]);
    if (quantity !== null && unit) return { quantity, unit };
  }

  const quantity = parseNumberToken(token);
  return quantity !== null ? { quantity } : null;
}

function parseIngredientLine(rawLine: string): IngredientDraft | null {
  let line = rawLine
    .replace(/^\s*(?:[-*]|\d+[.)])\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) return null;

  let notes: string | undefined;
  const noteMatch = line.match(/\s+\(([^)]+)\)\s*$/);
  if (noteMatch) {
    notes = noteMatch[1].trim();
    line = line.slice(0, noteMatch.index).trim();
  }

  line = line.replace(/^(\d+\/\d+|\d+(?:\.\d+)?)([a-zA-Z]+)\b/, "$1 $2");

  const namedAmount = line.match(/^(.+?)\s+-\s+(.+)$/);
  if (namedAmount) {
    const parsedAmount = parseIngredientLine(`${namedAmount[2]} ${namedAmount[1]}`);
    return parsedAmount ? { ...parsedAmount, notes: notes ?? parsedAmount.notes } : null;
  }

  const parts = line.split(" ");
  const firstQuantity = parseNumberToken(parts[0]);
  if (firstQuantity !== null) {
    let quantity = firstQuantity;
    let index = 1;
    const secondQuantity = parts[index] ? parseNumberToken(parts[index]) : null;
    if (secondQuantity !== null && parts[index].includes("/")) {
      quantity += secondQuantity;
      index += 1;
    }

    const unit = parts[index] ? normalizeUnit(parts[index]) : undefined;
    if (unit) index += 1;

    if (!unit) {
      const quantityFirstTrailingUnit = parts.at(-1) ? normalizeUnit(parts.at(-1)!) : undefined;
      if (quantityFirstTrailingUnit && parts.length > index + 1) {
        const name = parts.slice(index, -1).join(" ").replace(/,$/, "").trim();
        if (name) {
          return {
            name: capitalize(name),
            quantity,
            unit: quantityFirstTrailingUnit,
            notes,
          };
        }
      }
    }

    const name = parts.slice(index).join(" ").replace(/,$/, "").trim();
    if (name) {
      return { name: capitalize(name), quantity, unit, notes };
    }
  }

  const lastPart = parts.at(-1);
  const secondLastPart = parts.at(-2);
  const trailingUnit = lastPart ? normalizeUnit(lastPart) : undefined;
  const trailingQuantity = secondLastPart ? parseNumberToken(secondLastPart) : null;
  if (trailingUnit && trailingQuantity !== null && parts.length > 2) {
    const name = parts.slice(0, -2).join(" ").replace(/,$/, "").trim();
    if (name) {
      return {
        name: capitalize(name),
        quantity: trailingQuantity,
        unit: trailingUnit,
        notes,
      };
    }
  }

  const trailingAmount = lastPart ? parseQuantityUnitToken(lastPart) : null;
  if (trailingAmount && parts.length > 1) {
    const name = parts.slice(0, -1).join(" ").replace(/,$/, "").trim();
    if (name) {
      return {
        name: capitalize(name),
        quantity: trailingAmount.quantity,
        unit: trailingAmount.unit,
        notes,
      };
    }
  }

  const approx = line.match(/^(a handful|handful|a pinch|pinch|some|a few|few|to taste)\s+(.+)$/i);
  if (approx) {
    return {
      name: capitalize(approx[2].trim().replace(/^of\s+/i, "")),
      approximate: true,
      quantityText: approx[1].trim(),
      notes,
    };
  }

  return { name: capitalize(line), notes };
}

function parseBulkIngredients(text: string): IngredientDraft[] {
  return text
    .split(/[\r\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseIngredientLine)
    .filter((item): item is IngredientDraft => Boolean(item?.name));
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function displayUnit(unit?: string, quantity?: number): string | undefined {
  if (!unit) return undefined;
  if (unit === "clove" && quantity !== 1) return "cloves";
  return unit;
}

function formatIngredientDraftPreview(item: IngredientDraft): string {
  if (item.approximate) {
    return [item.quantityText, item.name].filter(Boolean).join(" ");
  }
  return [item.quantity, displayUnit(item.unit, item.quantity), item.name]
    .filter((part) => part !== undefined && part !== "")
    .join(" ");
}

export function IngredientList({
  ingredients,
  recipeId,
  onAdd,
  onUpdate,
  onDelete,
  scale = 1,
  readOnly = false,
}: IngredientListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    quantity: "",
    unit: "",
    approximate: false,
    quantityText: "",
  });
  const [savingId, setSavingId] = useState<number | null>(null);
  const addingRef = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);
  const parsedBulkIngredients = useMemo(
    () => parseBulkIngredients(bulkText),
    [bulkText]
  );

  const handleAdd = useCallback(async () => {
    if (!draft.name.trim() || addingRef.current) return;
    addingRef.current = true;
    try {
      await onAdd(recipeId, {
        name: capitalize(draft.name.trim()),
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
    } finally {
      addingRef.current = false;
    }
  }, [draft, onAdd, recipeId]);

  // Auto-add when focus leaves the entire ingredient form
  const handleFormBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // If focus is moving to another element inside the form, don't add yet
      if (formRef.current?.contains(e.relatedTarget as Node)) return;
      if (draft.name.trim()) {
        handleAdd();
      }
    },
    [draft.name, handleAdd]
  );

  const handleBulkAdd = useCallback(async () => {
    const parsed = parseBulkIngredients(bulkText);
    if (parsed.length === 0 || bulkSaving) return;
    setBulkSaving(true);
    try {
      for (const item of parsed) {
        await onAdd(recipeId, item);
      }
      setBulkText("");
      setIsBulkAdding(false);
    } finally {
      setBulkSaving(false);
    }
  }, [bulkSaving, bulkText, onAdd, recipeId]);

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

  if (readOnly) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-800">Ingredients</h3>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#800020]/10 px-1.5 text-xs font-medium text-[#800020]">
              {ingredients.length}
            </span>
          </div>
        </div>

        {ingredients.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-400">
            No ingredients yet
          </p>
        ) : (
          <ul className="space-y-2">
            {ingredients.map((ing) => {
              const amount = ing.approximate
                ? ing.quantityText
                : [
                    ing.quantity && scale !== 1 ? formatScaledQuantity(ing.quantity, scale) : ing.quantity,
                    displayUnit(ing.unit ?? undefined, ing.quantity ?? undefined),
                  ].filter(Boolean).join(" ");
              return (
                <li key={ing.id} className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 px-3 py-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#800020]/45" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-medium text-neutral-800">{ing.name}</span>
                      {amount && <span className="text-sm text-[#521224]">{amount}</span>}
                    </div>
                    {ing.notes && <p className="mt-0.5 text-xs text-neutral-500">{ing.notes}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-800">Ingredients</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#800020]/10 px-1.5 text-xs font-medium text-[#800020]">
            {ingredients.length}
          </span>
        </div>
        {!isBulkAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setIsBulkAdding(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:border-[#800020]/30 hover:text-[#800020]"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Paste list
          </button>
        )}
      </div>

      {ingredients.length > 0 && (
        <ul className="mb-3 space-y-2">
          {ingredients.map((ing) => (
            <li
              key={ing.id}
              className="group flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50/50 px-3 py-2.5"
            >
              <div
                className={`grid min-w-0 flex-1 items-center gap-2 ${
                  ing.approximate
                    ? "grid-cols-[minmax(0,1fr)_minmax(84px,0.7fr)]"
                    : "grid-cols-[minmax(0,1fr)_56px_74px] sm:grid-cols-[minmax(0,1fr)_64px_86px]"
                }`}
              >
                {/* Name first */}
                <input
                  defaultValue={ing.name}
                  onBlur={(e) =>
                    handleFieldBlur(ing, "name", capitalize(e.target.value.trim()))
                  }
                  className="min-w-0 rounded border border-transparent bg-transparent px-1 text-sm outline-none transition hover:border-neutral-200 focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10"
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
                    className="min-w-0 rounded border border-transparent bg-transparent px-1 text-sm italic text-neutral-700 outline-none transition hover:border-neutral-200 focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10"
                    placeholder="a handful, agak-agak, to taste"
                  />
                ) : (
                  <>
                    {/* Qty */}
                    {scale !== 1 && ing.quantity ? (
                      <span className="w-full rounded bg-white px-1.5 py-1.5 text-center text-sm font-medium tabular-nums text-[#800020]">
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
                        className="w-full rounded border border-transparent bg-transparent px-1 text-center text-sm tabular-nums outline-none transition hover:border-neutral-200 focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10"
                        placeholder="qty"
                      />
                    )}
                    {/* Unit dropdown */}
                    <select
                      defaultValue={ing.unit ?? ""}
                      onChange={(e) =>
                        handleFieldBlur(ing, "unit", e.target.value || null)
                      }
                      className="w-full rounded border border-transparent bg-transparent px-1 text-xs text-neutral-600 outline-none transition hover:border-neutral-200 focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10"
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

              <div className="flex shrink-0 items-center justify-end gap-1.5">
                <SaveIndicator isSaving={savingId === ing.id} />

                {/* Toggle: precise ↔ approximate */}
                <button
                  type="button"
                  className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition ${
                    ing.approximate
                      ? "border-[#800020]/25 bg-[#800020]/10 text-[#800020]"
                      : "border-neutral-200 bg-white text-neutral-500 hover:border-[#800020]/20 hover:text-[#800020]"
                  }`}
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
                  ≈
                </button>

                <button
                  type="button"
                  className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50"
                  onClick={() => onDelete(recipeId, ing.id)}
                  aria-label="Remove ingredient"
                  title="Remove ingredient"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isBulkAdding && (
        <div className="mb-3 rounded-lg border border-[#800020]/15 bg-[#800020]/5 p-3">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Paste ingredients separated by line breaks or commas:
2 tbsp light soy sauce, 300 g yellow noodles
a handful coriander`}
            rows={5}
            className="w-full resize-y rounded-lg border border-[#800020]/15 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-800 outline-none transition focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10 placeholder:text-neutral-400"
            autoFocus
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="1"
              variant="solid"
              onClick={handleBulkAdd}
              disabled={parsedBulkIngredients.length === 0 || bulkSaving}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {bulkSaving
                ? "Adding..."
                : `Add ${parsedBulkIngredients.length || ""} ingredient${parsedBulkIngredients.length === 1 ? "" : "s"}`.trim()}
            </Button>
            <Button
              size="1"
              variant="soft"
              color="gray"
              onClick={() => {
                setBulkText("");
                setIsBulkAdding(false);
              }}
            >
              Cancel
            </Button>
            {parsedBulkIngredients.length > 0 && (
              <span className="text-xs text-[#521224]">
                Preview: {parsedBulkIngredients.slice(0, 3).map(formatIngredientDraftPreview).join(", ")}
                {parsedBulkIngredients.length > 3 ? "..." : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {isAdding ? (
        <div
          ref={formRef}
          onBlur={handleFormBlur}
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
        >
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
            className={`mb-3 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
              draft.approximate
                ? "border-[#800020]/30 bg-[#800020]/5 text-[#800020]"
                : "border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300 hover:text-neutral-500"
            }`}
          >
            <span className="text-xs leading-none">≈</span>
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
              onClick={async () => {
                if (draft.name.trim()) {
                  await handleAdd();
                }
                setIsAdding(false);
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
          onClick={() => {
            setIsBulkAdding(false);
            setIsAdding(true);
          }}
        >
          <PlusIcon className="mr-1 h-4 w-4" />
          {ingredients.length === 0 ? "Add ingredients" : "Add ingredient"}
        </Button>
      )}
    </section>
  );
}
