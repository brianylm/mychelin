"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { IngredientTypeahead } from "@/components/ui/IngredientTypeahead";
import type { Ingredient } from "@/db/schema";
import { formatScaledQuantity } from "./ServingScaler";
import {
  createIngredientAutosave,
  ingredientAutosaveValues,
  type IngredientAutosaveField,
  type IngredientAutosaveSnapshot,
} from "@/lib/ingredient-autosave";

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
    data: Partial<Ingredient>,
    options?: { keepalive?: boolean }
  ) => Promise<void>;
  onDelete: (recipeId: number, ingredientId: number) => Promise<void>;
  scale?: number;
  readOnly?: boolean;
  loading?: boolean;
  /** Called with the number of ingredient saves pending (debounced or in flight). */
  onPendingSavesChange?: (count: number) => void;
}

const fieldBase =
  "rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-2 py-1.5 text-sm outline-none transition focus:border-ui-accent focus:ring-1 focus:ring-ui-focus-soft focus:bg-ui-surface-raised placeholder:text-ui-muted";
const editNameFieldBase =
  "h-11 w-full min-w-0 rounded-lg border border-ui-border bg-ui-surface-raised px-3 text-[15px] font-medium text-ui-text outline-none transition placeholder:text-ui-muted focus:border-ui-accent focus:ring-1 focus:ring-ui-focus-soft sm:h-10 sm:text-sm";
const editAmountFieldBase =
  "h-10 w-full rounded-lg border border-ui-border bg-ui-surface-raised px-2.5 text-sm text-ui-text outline-none transition placeholder:text-ui-muted focus:border-ui-accent focus:ring-1 focus:ring-ui-focus-soft";
const editDetailFieldBase =
  "h-10 w-full rounded-lg border border-ui-border bg-ui-surface-raised px-3 text-sm text-ui-text outline-none transition placeholder:text-ui-muted focus:border-ui-accent focus:ring-1 focus:ring-ui-focus-soft";

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

function stripIngredientListPrefix(rawLine: string): string {
  return rawLine
    .trimStart()
    .replace(/^(?:[-*•‣◦▪▫‒–—])\s*/, "")
    .replace(/^(?:\(?\d{1,3}\)?[.)])\s*/, "")
    .replace(/^\d{1,3}\s*[-:]\s+/, "")
    .replace(/^[A-Za-z][.)]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIngredientLine(rawLine: string): IngredientDraft | null {
  let line = stripIngredientListPrefix(rawLine);
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

function formatReadOnlyIngredientAmount(ingredient: Ingredient, scale: number): string {
  const quantity = ingredient.quantity && scale !== 1
    ? formatScaledQuantity(ingredient.quantity, scale)
    : ingredient.quantity;
  const hasQuantity = quantity !== null && quantity !== undefined && String(quantity) !== "";
  const unit = ingredient.unit
    ? displayUnit(ingredient.unit, ingredient.quantity ?? undefined)
    : undefined;

  if (ingredient.approximate) {
    const quantityText = ingredient.quantityText?.trim();
    if (quantityText) return quantityText;
    return ["agak-agak", hasQuantity ? quantity : null, unit]
      .filter((part) => part !== null && part !== undefined && part !== "")
      .join(" ");
  }

  if (hasQuantity) {
    return [quantity, unit]
      .filter((part) => part !== null && part !== undefined && part !== "")
      .join(" ");
  }

  return unit ?? "";
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
  loading = false,
  onPendingSavesChange,
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
  // "<ingredientId>:<field>" of the focused input, so a debounced save +
  // refetch never swaps that input out from under the user's typing.
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<IngredientAutosaveSnapshot>({
    pending: 0,
    hasUnsaved: false,
    errorIds: [],
  });
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);
  // Ingredient field autosave: debounced + blur saves, one merged PATCH per
  // ingredient, serialized per ingredient, flushed with keepalive on
  // pagehide / hidden / unmount. See lib/ingredient-autosave.
  const [autosave] = useState(() =>
    createIngredientAutosave({
      send: ({ recipeId: rid, ingredientId, patch, keepalive }) =>
        onUpdateRef.current(rid, ingredientId, patch as Partial<Ingredient>, {
          keepalive,
        }),
      onChange: setSaveState,
    })
  );

  useEffect(() => {
    onPendingSavesChange?.(saveState.pending);
    return () => onPendingSavesChange?.(0);
  }, [saveState.pending, onPendingSavesChange]);

  useEffect(() => {
    const flush = () => void autosave.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autosave]);

  // Flush when switching recipes, leaving edit mode or unmounting.
  useEffect(() => {
    return () => {
      void autosave.flush();
    };
  }, [autosave, recipeId, readOnly]);

  // Warn before leaving only while an ingredient is unsaved or saving.
  useEffect(() => {
    if (!saveState.hasUnsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      void autosave.flush();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState.hasUnsaved, autosave]);

  const editField = useCallback(
    (
      ingredient: Ingredient,
      field: IngredientAutosaveField,
      value: string | number | null,
      immediate: boolean
    ) => {
      autosave.track(ingredient.id, recipeId, ingredientAutosaveValues(ingredient));
      if (immediate) void autosave.blur(ingredient.id, recipeId, field, value);
      else autosave.edit(ingredient.id, recipeId, field, value);
    },
    [autosave, recipeId]
  );

  const fieldHandlers = (
    ingredient: Ingredient,
    field: IngredientAutosaveField,
    normalize: (raw: string) => string | number | null
  ) => ({
    onFocus: () => setFocusedField(`${ingredient.id}:${field}`),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      editField(ingredient, field, normalize(e.target.value), false),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      setFocusedField(null);
      editField(ingredient, field, normalize(e.target.value), true);
    },
  });
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
      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-ui-text">Ingredients</h3>
        </div>

        {loading ? (
          <div className="space-y-3" role="status" aria-label="Loading ingredients">
            <div className="h-4 w-2/3 animate-pulse rounded bg-ui-surface-subtle" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-ui-surface-subtle" />
          </div>
        ) : ingredients.length === 0 ? (
          <p className="text-sm text-ui-muted">
            No ingredients yet
          </p>
        ) : (
          <ul className="space-y-4">
            {ingredients.map((ing) => {
              const amount = formatReadOnlyIngredientAmount(ing, scale);
              return (
                <li key={ing.id} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ui-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-medium text-ui-text">{ing.name}</span>
                      {amount && <span className="text-sm text-ui-text">{amount}</span>}
                    </div>
                    {ing.notes && <p className="mt-0.5 text-xs text-ui-muted">{ing.notes}</p>}
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
    <section className="rounded-2xl border border-ui-border bg-ui-surface-raised p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ui-text">Ingredients</h3>
          <span className="text-sm text-ui-muted">· {ingredients.length}</span>
        </div>
        {!isBulkAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setIsBulkAdding(true);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-ui-border bg-ui-surface-raised px-2.5 py-1 text-xs font-medium text-ui-muted transition hover:border-ui-border-strong hover:text-ui-accent"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Paste list
          </button>
        )}
      </div>

      {ingredients.length > 0 && (
        <ul className="mb-3 space-y-2">
          {ingredients.map((ing) => {
            const actionControls = (
              <>
                <SaveIndicator
                  isSaving={
                    savingId === ing.id ||
                    (autosave.isDirty(ing.id) && !saveState.errorIds.includes(ing.id))
                  }
                />

                <button
                  type="button"
                  className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition ${
                    ing.approximate
                      ? "border-ui-border bg-ui-accent-muted text-ui-accent"
                      : "border-ui-border bg-ui-surface-raised text-ui-muted hover:border-ui-border-strong hover:text-ui-accent"
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
                  className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-ui-border bg-ui-surface-raised text-ui-danger transition hover:border-ui-border hover:bg-ui-danger-soft"
                  onClick={() => {
                    autosave.discard(ing.id);
                    onDelete(recipeId, ing.id);
                  }}
                  aria-label="Remove ingredient"
                  title="Remove ingredient"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            );

            const nameInput = (
              <input
                defaultValue={ing.name}
                {...fieldHandlers(ing, "name", (v) => capitalize(v.trim()))}
                className={editNameFieldBase}
                placeholder="ingredient"
              />
            );

            const showAmountText =
              !ing.approximate &&
              (!!ing.quantityText || focusedField === `${ing.id}:quantityText`);

            return (
              <li
                key={ing.id}
                className="group rounded-xl border border-ui-border bg-ui-surface-raised p-3"
              >
                {ing.approximate ? (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.8fr)_auto] sm:items-center">
                    {nameInput}
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:contents">
                      <input
                        key={`qt-${ing.id}`}
                        defaultValue={ing.quantityText ?? ""}
                        {...fieldHandlers(ing, "quantityText", (v) => v || null)}
                        className={`${editAmountFieldBase} text-ui-text`}
                        placeholder="a handful, agak-agak, to taste"
                      />
                      <div className="flex shrink-0 items-center justify-end gap-1.5">
                        {actionControls}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_72px_92px_auto] sm:items-center">
                    {nameInput}
                    <div className="grid grid-cols-[64px_minmax(82px,1fr)_auto] items-center gap-2 sm:contents">
                      {scale !== 1 && ing.quantity && focusedField !== `${ing.id}:quantity` ? (
                        <span className="flex h-10 w-full items-center justify-center rounded-lg border border-ui-border bg-ui-surface-raised px-2 text-center text-sm font-medium tabular-nums text-ui-accent">
                          {formatScaledQuantity(ing.quantity, scale)}
                        </span>
                      ) : (
                        <input
                          defaultValue={ing.quantity ?? ""}
                          {...fieldHandlers(ing, "quantity", (v) =>
                            v ? parseFloat(v) : null
                          )}
                          className={`${editAmountFieldBase} text-center tabular-nums`}
                          placeholder="qty"
                        />
                      )}
                      <select
                        defaultValue={ing.unit ?? ""}
                        onChange={(e) =>
                          editField(ing, "unit", e.target.value || null, true)
                        }
                        className={`${editAmountFieldBase} text-ui-text`}
                      >
                        <option value="">unit</option>
                        {UNIT_OPTIONS.filter(Boolean).map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <div className="flex shrink-0 items-center justify-end gap-1.5">
                        {actionControls}
                      </div>
                    </div>
                  </div>
                )}
                <div className={`mt-2 grid gap-2 ${showAmountText ? "sm:grid-cols-2" : ""}`}>
                  {showAmountText && (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-ui-muted">
                        Amount text
                      </span>
                      <input
                        defaultValue={ing.quantityText ?? ""}
                        {...fieldHandlers(ing, "quantityText", (v) => v.trim() || null)}
                        className={editDetailFieldBase}
                        placeholder="~100g, a handful, to taste"
                      />
                    </label>
                  )}
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-ui-muted">
                      Prep note
                    </span>
                    <input
                      defaultValue={ing.notes ?? ""}
                      {...fieldHandlers(ing, "notes", (v) => v.trim() || null)}
                      className={editDetailFieldBase}
                      placeholder="cut into quarters, minced, optional"
                    />
                  </label>
                </div>
                {saveState.errorIds.includes(ing.id) && (
                  <p className="mt-2 text-xs text-ui-danger" role="alert">
                    Not saved —{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => void autosave.retry(ing.id)}
                    >
                      retry
                    </button>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isBulkAdding && (
        <div className="mb-3 rounded-lg border border-ui-border bg-ui-accent-muted p-3">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Paste ingredients separated by line breaks or commas:
2 tbsp light soy sauce, 300 g yellow noodles
a handful coriander`}
            rows={5}
            className="w-full resize-y rounded-lg border border-ui-border bg-ui-surface-raised px-3 py-2 text-sm leading-relaxed text-ui-text outline-none transition focus:border-ui-accent focus:ring-1 focus:ring-ui-focus-soft placeholder:text-ui-muted"
            autoFocus
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleBulkAdd}
              disabled={parsedBulkIngredients.length === 0 || bulkSaving}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {bulkSaving
                ? "Adding..."
                : `Add ${parsedBulkIngredients.length || ""} ingredient${parsedBulkIngredients.length === 1 ? "" : "s"}`.trim()}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setBulkText("");
                setIsBulkAdding(false);
              }}
            >
              Cancel
            </Button>
            {parsedBulkIngredients.length > 0 && (
              <span className="text-xs text-ui-text">
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
          className="rounded-lg border border-ui-border bg-ui-surface-subtle p-3"
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
              className={`mb-3 w-full ${fieldBase}`}
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
                className={`flex-1 ${fieldBase} ${!draft.unit ? "text-ui-muted" : "text-ui-text"}`}
              >
                <option value="">Select unit...</option>
                {UNIT_OPTIONS.filter(Boolean).map((u) => (
                  <option key={u} value={u} className="text-ui-text">
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
                ? "border-ui-accent bg-ui-accent-muted text-ui-accent"
                : "border-ui-border bg-ui-surface-raised text-ui-muted hover:border-ui-border-strong hover:text-ui-muted"
            }`}
          >
            <span className="text-xs leading-none">≈</span>
            {draft.approximate ? "Approximate" : "Use approximate"}
          </button>

          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleAdd}>
              Add
            </Button>
            <Button
              size="sm"
              variant="secondary"
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
          size="md"
          variant="secondary"
          className="w-full"
          onClick={() => {
            setIsBulkAdding(false);
            setIsAdding(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          {ingredients.length === 0 ? "Add ingredients" : "Add ingredient"}
        </Button>
      )}
    </section>
  );
}
