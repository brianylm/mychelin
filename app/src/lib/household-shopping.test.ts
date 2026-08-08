import { describe, it, expect } from "vitest";
import {
  buildMovePlan,
  groupMovesAgainstInventory,
  partitionForMove,
  type ShoppingStateRow,
} from "./household-shopping";
import { blockingScaleFactor } from "./household-portions";

function row(overrides: Partial<ShoppingStateRow>): ShoppingStateRow {
  return {
    id: 1,
    itemKey: "manual_rice_g",
    name: "rice",
    unit: "g",
    category: null,
    quantity: 500,
    approximate: false,
    source: "generated",
    catalogIngredientId: null,
    tickedAt: null,
    tickedBy: null,
    movedAt: null,
    movedBy: null,
    ...overrides,
  };
}

describe("partitionForMove (tick → inventory idempotency)", () => {
  it("only ticked, unmoved rows are pushable", () => {
    const rows = [
      row({ id: 1, tickedAt: "2026-08-08T10:00:00Z" }),
      row({ id: 2, itemKey: "unticked" }), // never ticked
      row({ id: 3, itemKey: "moved", tickedAt: "2026-08-08T09:00:00Z", movedAt: "2026-08-08T10:00:00Z" }),
    ];
    const { pending, alreadyMoved } = partitionForMove(rows);
    expect(pending.map((r) => r.id)).toEqual([1]);
    expect(alreadyMoved.map((r) => r.id)).toEqual([3]);
  });

  it("a second push after stamping moved_at is a no-op", () => {
    const first = partitionForMove([row({ id: 1, tickedAt: "2026-08-08T10:00:00Z" })]);
    expect(first.pending).toHaveLength(1);
    // The route stamps movedAt in the same request; simulating that:
    const stamped = first.pending.map((r) => ({
      ...r,
      movedAt: "2026-08-08T10:05:00Z",
      movedBy: 42,
    }));
    const second = partitionForMove(stamped);
    expect(second.pending).toHaveLength(0);
    expect(second.alreadyMoved).toHaveLength(1);
  });
});

describe("buildMovePlan", () => {
  it("applies edit-before-confirm overrides", () => {
    const pending = [row({ id: 1, quantity: 500 })];
    const { moves } = buildMovePlan(pending, {
      manual_rice_g: { quantity: 750 },
    });
    expect(moves).toHaveLength(1);
    expect(moves[0].quantity).toBe(750);
  });

  it("skips items with no usable quantity (approximate, never edited)", () => {
    const pending = [row({ id: 1, quantity: null, approximate: true })];
    const { moves, skipped } = buildMovePlan(pending, {});
    expect(moves).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    // …but an override rescues them.
    const rescued = buildMovePlan(pending, { manual_rice_g: { quantity: 2, unit: "cup" } });
    expect(rescued.moves[0]).toMatchObject({ quantity: 2, unit: "cup" });
  });
});

describe("groupMovesAgainstInventory", () => {
  const inventoryRows = [
    { id: 10, name: "Rice", unit: "g", quantity: 200, catalogIngredientId: null },
    { id: 11, name: "Chicken", unit: "g", quantity: 100, catalogIngredientId: 7 },
  ];

  it("increments existing rows matched case-insensitively by name+unit", () => {
    const { increments, inserts } = groupMovesAgainstInventory(
      [{ name: "rice", unit: "g", quantity: 500, catalogIngredientId: null }],
      inventoryRows
    );
    expect(increments).toEqual([{ inventoryId: 10, add: 500, names: ["rice"] }]);
    expect(inserts).toHaveLength(0);
  });

  it("matches by catalog id and merges duplicate moves into one increment", () => {
    const { increments, inserts } = groupMovesAgainstInventory(
      [
        { name: "chicken", unit: "g", quantity: 300, catalogIngredientId: 7 },
        { name: "Chicken", unit: "g", quantity: 200, catalogIngredientId: 7 },
      ],
      inventoryRows
    );
    expect(increments).toEqual([
      { inventoryId: 11, add: 500, names: ["chicken", "Chicken"] },
    ]);
    expect(inserts).toHaveLength(0);
  });

  it("inserts new rows for items the inventory does not have", () => {
    const { increments, inserts } = groupMovesAgainstInventory(
      [{ name: "sambal", unit: "tbsp", quantity: 2, catalogIngredientId: null }],
      inventoryRows
    );
    expect(increments).toHaveLength(0);
    expect(inserts).toHaveLength(1);
  });
});

describe("blockingScaleFactor (blocking-aware shopping quantities)", () => {
  it("is 1 without a household context", () => {
    expect(blockingScaleFactor(0, 0)).toBe(1);
  });

  it("scales by the share of members still eating", () => {
    expect(blockingScaleFactor(4, 1)).toBe(0.75);
    expect(blockingScaleFactor(2, 1)).toBe(0.5);
    expect(blockingScaleFactor(3, 0)).toBe(1);
  });

  it("is 0 when everyone blocked the slot (callers skip the slot)", () => {
    expect(blockingScaleFactor(2, 2)).toBe(0);
  });

  it("clamps out-of-range inputs", () => {
    expect(blockingScaleFactor(2, 5)).toBe(0);
    expect(blockingScaleFactor(2, -1)).toBe(1);
  });
});
