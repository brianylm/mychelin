import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createIngredientAutosave,
  ingredientAutosaveValues,
  type IngredientSaveRequest,
} from "./ingredient-autosave";

const onion = {
  id: 1,
  name: "Onion",
  quantity: 1,
  unit: null,
  quantityText: null,
  notes: null,
};
const garlic = {
  id: 2,
  name: "Garlic",
  quantity: 3,
  unit: "clove",
  quantityText: null,
  notes: "minced",
};
const egg = { id: 3, name: "Egg", quantity: 2, unit: null, quantityText: null, notes: null };

function setup(sendImpl?: (req: IngredientSaveRequest) => Promise<void>) {
  const calls: IngredientSaveRequest[] = [];
  const send = vi.fn(async (req: IngredientSaveRequest) => {
    calls.push(req);
    if (sendImpl) await sendImpl(req);
  });
  const onChange = vi.fn();
  const autosave = createIngredientAutosave({ send, debounceMs: 800, onChange });
  for (const ing of [onion, garlic, egg]) {
    autosave.track(ing.id, 10, ingredientAutosaveValues(ing));
  }
  return { autosave, send, calls, onChange };
}

describe("createIngredientAutosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("debounces typing into a single save", async () => {
    const { autosave, calls } = setup();
    autosave.edit(1, 10, "name", "Red");
    vi.advanceTimersByTime(300);
    autosave.edit(1, 10, "name", "Red oni");
    vi.advanceTimersByTime(300);
    autosave.edit(1, 10, "name", "Red onion");
    expect(calls).toHaveLength(0);
    expect(autosave.snapshot().pending).toBe(1);
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toEqual([
      { recipeId: 10, ingredientId: 1, patch: { name: "Red onion" }, keepalive: false },
    ]);
    expect(autosave.isDirty(1)).toBe(false);
    expect(autosave.snapshot()).toEqual({ pending: 0, hasUnsaved: false, errorIds: [] });
  });

  it("merges two fields of one ingredient edited quickly into one PATCH", async () => {
    const { autosave, calls } = setup();
    autosave.edit(2, 10, "quantity", 4);
    vi.advanceTimersByTime(400);
    autosave.edit(2, 10, "notes", "smashed");
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toEqual([
      {
        recipeId: 10,
        ingredientId: 2,
        patch: { quantity: 4, notes: "smashed" },
        keepalive: false,
      },
    ]);
  });

  it("sends only fields that changed since the last value sent", async () => {
    const { autosave, calls } = setup();
    await autosave.blur(2, 10, "quantity", 4);
    autosave.edit(2, 10, "quantity", 4);
    autosave.edit(2, 10, "notes", "smashed");
    await vi.advanceTimersByTimeAsync(800);
    expect(calls.map((c) => c.patch)).toEqual([{ quantity: 4 }, { notes: "smashed" }]);
  });

  it("sends A -> B -> A in order (compares against last sent, not server)", async () => {
    let release: (() => void) | null = null;
    const { autosave, calls } = setup((req) =>
      req.patch.unit === "g"
        ? new Promise<void>((r) => {
            release = r;
          })
        : Promise.resolve()
    );
    // onion.unit is null on the server.
    void autosave.blur(1, 10, "unit", "g");
    void autosave.blur(1, 10, "unit", null);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.map((c) => c.patch)).toEqual([{ unit: "g" }]);
    release!();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.map((c) => c.patch)).toEqual([{ unit: "g" }, { unit: null }]);
    expect(autosave.isDirty(1)).toBe(false);
  });

  it("flush sends keepalive PATCHes for all dirty ingredients and none for clean ones", async () => {
    const { autosave, calls } = setup();
    autosave.edit(1, 10, "name", "Shallot");
    autosave.edit(2, 10, "notes", null);
    autosave.edit(2, 10, "quantity", 5);
    // egg (3) untouched; editing back to the server value is clean too.
    autosave.edit(3, 10, "quantity", 2);
    expect(autosave.snapshot().hasUnsaved).toBe(true);
    await autosave.flush();
    expect(calls).toEqual([
      { recipeId: 10, ingredientId: 1, patch: { name: "Shallot" }, keepalive: true },
      {
        recipeId: 10,
        ingredientId: 2,
        patch: { notes: null, quantity: 5 },
        keepalive: true,
      },
    ]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toHaveLength(2);
    expect(autosave.snapshot().hasUnsaved).toBe(false);
  });

  it("never sends an empty name (deleting stays an explicit action)", async () => {
    const { autosave, calls } = setup();
    autosave.edit(1, 10, "name", "");
    autosave.edit(1, 10, "notes", "sliced");
    await autosave.flush();
    expect(calls).toEqual([
      { recipeId: 10, ingredientId: 1, patch: { notes: "sliced" }, keepalive: true },
    ]);
    await autosave.blur(1, 10, "name", "");
    expect(calls).toHaveLength(1);
  });

  it("keeps an ingredient dirty after a failed save; retry succeeds", async () => {
    let fail = true;
    const onError = vi.fn();
    const calls: IngredientSaveRequest[] = [];
    const autosave = createIngredientAutosave({
      send: async (req) => {
        calls.push(req);
        if (fail) throw new Error("offline");
      },
      onError,
    });
    autosave.track(2, 10, ingredientAutosaveValues(garlic));
    await autosave.blur(2, 10, "notes", "crushed");
    expect(onError).toHaveBeenCalledWith(2, expect.any(Error));
    expect(autosave.isDirty(2)).toBe(true);
    expect(autosave.snapshot().errorIds).toEqual([2]);
    expect(autosave.snapshot().hasUnsaved).toBe(true);

    fail = false;
    await autosave.retry(2);
    expect(calls.map((c) => c.patch)).toEqual([{ notes: "crushed" }, { notes: "crushed" }]);
    expect(autosave.isDirty(2)).toBe(false);
    expect(autosave.snapshot().errorIds).toEqual([]);
  });

  it("a late older response does not overwrite a newer confirmation", async () => {
    let releaseOld: (() => void) | null = null;
    const { autosave } = setup((req) =>
      req.patch.notes === "old" && !req.keepalive
        ? new Promise<void>((r) => {
            releaseOld = r;
          })
        : Promise.resolve()
    );
    void autosave.blur(1, 10, "notes", "old");
    await vi.advanceTimersByTimeAsync(0);
    autosave.edit(1, 10, "notes", "new");
    await autosave.flush();
    expect(autosave.isDirty(1)).toBe(true); // "old" still in flight
    releaseOld!();
    await vi.advanceTimersByTimeAsync(0);
    expect(autosave.isDirty(1)).toBe(false);
  });
});
