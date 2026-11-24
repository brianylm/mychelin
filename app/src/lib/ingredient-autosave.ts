/**
 * Autosave queue for recipe ingredient fields (name, quantity, unit,
 * quantityText, notes): a wrapper over the generic queue in
 * autosave-queue.ts. Fields of one ingredient edited within the debounce
 * window go out as one PATCH with only the changed fields. An empty name
 * is never sent, so a flush never blanks or deletes an ingredient
 * (removing stays the explicit trash button).
 */

import {
  AUTOSAVE_DEBOUNCE_MS,
  createAutosaveQueue,
  type AutosaveSnapshot,
} from "./autosave-queue";

/** Text/number fields edited in IngredientList (all in INGREDIENT_PATCH_FIELDS). */
export const INGREDIENT_AUTOSAVE_FIELDS = [
  "name",
  "quantity",
  "unit",
  "quantityText",
  "notes",
] as const;

export type IngredientAutosaveField = (typeof INGREDIENT_AUTOSAVE_FIELDS)[number];

export type IngredientAutosavePatch = Partial<
  Record<IngredientAutosaveField, string | number | null>
>;

export interface IngredientSaveRequest {
  recipeId: number;
  ingredientId: number;
  patch: IngredientAutosavePatch;
  keepalive: boolean;
}

export type IngredientAutosaveSnapshot = AutosaveSnapshot;

export interface IngredientAutosaveOptions {
  send: (req: IngredientSaveRequest) => Promise<void>;
  debounceMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  onChange?: (snapshot: IngredientAutosaveSnapshot) => void;
  onError?: (ingredientId: number, error: unknown) => void;
}

export const INGREDIENT_AUTOSAVE_DEBOUNCE_MS = AUTOSAVE_DEBOUNCE_MS;

/** Server values of the autosaved fields, for track(). */
export function ingredientAutosaveValues(ingredient: {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  quantityText?: string | null;
  notes?: string | null;
}): IngredientAutosavePatch {
  return {
    name: ingredient.name,
    quantity: ingredient.quantity ?? null,
    unit: ingredient.unit ?? null,
    quantityText: ingredient.quantityText ?? null,
    notes: ingredient.notes ?? null,
  };
}

export function createIngredientAutosave(options: IngredientAutosaveOptions) {
  const { send, ...rest } = options;
  const queue = createAutosaveQueue({
    ...rest,
    send: ({ recipeId, id, patch, keepalive }) =>
      send({
        recipeId,
        ingredientId: id,
        patch: patch as IngredientAutosavePatch,
        keepalive,
      }),
    isSendable: (field, value) => !(field === "name" && (value === "" || value === null)),
  });

  return {
    /** Register an ingredient with its server values. Known fields are kept. */
    track: (ingredientId: number, recipeId: number, values: IngredientAutosavePatch) =>
      queue.track(ingredientId, recipeId, values),
    /** Record a typed value and (re)start the ingredient's debounce timer. */
    edit: (
      ingredientId: number,
      recipeId: number,
      field: IngredientAutosaveField,
      value: string | number | null
    ) => queue.edit(ingredientId, recipeId, field, value),
    /** Blur or select change: record the value and save immediately. */
    blur: (
      ingredientId: number,
      recipeId: number,
      field: IngredientAutosaveField,
      value: string | number | null
    ) => queue.blur(ingredientId, recipeId, field, value),
    retry: queue.retry,
    flush: queue.flush,
    discard: queue.discard,
    isDirty: queue.isDirty,
    snapshot: queue.snapshot,
    dispose: queue.dispose,
  };
}

export type IngredientAutosave = ReturnType<typeof createIngredientAutosave>;
