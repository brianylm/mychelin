import { beforeEach, describe, expect, it, vi } from "vitest";

type InventoryRow = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  catalogIngredientId: number | null;
};

const state = vi.hoisted(() => ({
  inventory: [] as InventoryRow[],
}));

vi.mock("@/lib/feature-flags", () => ({ HOUSEHOLDS_ENABLED: true }));

vi.mock("@/db/ensure-schema", () => ({
  ensureMealPilotTables: vi.fn(async () => undefined),
}));

vi.mock("@/lib/households", () => ({
  getUserHousehold: vi.fn(async () => ({ household: { id: 3 } })),
}));

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  function query(rows: unknown[]) {
    const chain: Record<string, unknown> = {};
    for (const method of ["where", "orderBy", "limit"]) chain[method] = () => chain;
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject);
    return chain;
  }
  return {
    db: {
      select: () => ({
        from: (table: unknown) => {
          if (table === schema.mealPlans) {
            return query([
              { id: 11, recipeId: 101, householdId: 3, date: "2026-11-21", mealType: "dinner", servings: 1, targetPortions: null },
            ]);
          }
          if (table === schema.recipes) return query([{ userId: 7 }]);
          if (table === schema.householdMembers) return query([{ count: 2 }]);
          if (table === schema.inventory) return query(state.inventory);
          return query([]);
        },
      }),
      query: { ingredients: { findMany: async () => [] } },
    },
  };
});

import { buildDeductionProposal } from "./household-deduct";

const used = [
  { name: "Chicken", quantity: 500, unit: "g", catalogIngredientId: null },
  { name: "Rice", quantity: 2, unit: "cups", catalogIngredientId: null },
  { name: "Salt", quantity: null, unit: null, approximate: true },
];

describe("buildDeductionProposal", () => {
  beforeEach(() => {
    state.inventory = [];
  });

  it("returns null when nothing the recipe uses is tracked in shared inventory", async () => {
    state.inventory = [{ id: 1, name: "Milk", unit: "ml", quantity: 1000, catalogIngredientId: null }];
    expect(await buildDeductionProposal(7, 11, used)).toBeNull();
  });

  it("returns a proposal when at least one item is tracked", async () => {
    state.inventory = [{ id: 1, name: "Chicken", unit: "g", quantity: 800, catalogIngredientId: null }];
    const proposal = await buildDeductionProposal(7, 11, used);
    expect(proposal).not.toBeNull();
    expect(proposal!.items.find((item) => item.name === "Chicken")?.onHand).toBe(800);
    expect(proposal!.items.find((item) => item.name === "Rice")?.onHand).toBeNull();
    expect(proposal!.notTracked).toEqual(["Salt", "Rice"]);
  });
});
