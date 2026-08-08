import { describe, it, expect } from "vitest";
import {
  applyDeductions,
  computeDeductionItems,
  matchInventoryRow,
} from "./household-inventory";

describe("computeDeductionItems", () => {
  const ingredients = [
    { name: "chicken", quantity: 500, unit: "g", catalogIngredientId: 7 },
    { name: "rice", quantity: 2, unit: "cup" },
    { name: "salt", quantity: null, unit: null }, // no quantity
    { name: "sambal", quantity: 1, unit: "tbsp", approximate: true, quantityText: "agak-agak" },
  ];

  it("scales by the slot servings multiplier", () => {
    const { items } = computeDeductionItems(ingredients, 2, 1);
    expect(items.find((i) => i.name === "chicken")?.quantity).toBe(1000);
    expect(items.find((i) => i.name === "rice")?.quantity).toBe(4);
  });

  it("scales by the blocking eater factor", () => {
    // 4-member household, 1 blocked → factor 0.75 (packet decision 3/4).
    const { items } = computeDeductionItems(ingredients, 1, 0.75);
    expect(items.find((i) => i.name === "chicken")?.quantity).toBe(375);
    expect(items.find((i) => i.name === "rice")?.quantity).toBe(1.5);
  });

  it("combines servings and eater scale", () => {
    const { items } = computeDeductionItems(ingredients, 2, 0.5);
    expect(items.find((i) => i.name === "chicken")?.quantity).toBe(500);
  });

  it("lists approximate and quantity-less ingredients as untracked", () => {
    const { untracked } = computeDeductionItems(ingredients, 1, 1);
    expect(untracked).toContain("salt");
    expect(untracked).toContain("sambal");
    expect(untracked).not.toContain("chicken");
  });

  it("drops zero-quantity results into untracked instead of deducting nothing", () => {
    const { items, untracked } = computeDeductionItems(
      [{ name: "garnish", quantity: 0.001, unit: "g" }],
      1,
      0.25
    );
    expect(items).toHaveLength(0);
    expect(untracked).toContain("garnish");
  });

  it("treats bogus multipliers as 1 rather than zeroing the deduction", () => {
    const { items } = computeDeductionItems(ingredients, Number.NaN, Number.POSITIVE_INFINITY);
    expect(items.find((i) => i.name === "chicken")?.quantity).toBe(500);
  });
});

describe("matchInventoryRow", () => {
  const rows = [
    { id: 1, name: "Chicken", unit: "g", quantity: 800, catalogIngredientId: 7 },
    { id: 2, name: "chicken", unit: "pcs", quantity: 2, catalogIngredientId: null },
    { id: 3, name: "Rice", unit: "cup", quantity: 5, catalogIngredientId: null },
  ];

  it("matches by catalog id first", () => {
    const match = matchInventoryRow(
      { name: "poultry", unit: "g", catalogIngredientId: 7 },
      rows
    );
    expect(match?.id).toBe(1);
  });

  it("matches by name case-insensitively, respecting the unit", () => {
    expect(
      matchInventoryRow({ name: "CHICKEN", unit: "pcs", catalogIngredientId: null }, rows)?.id
    ).toBe(2);
    expect(
      matchInventoryRow({ name: "rice", unit: "cup", catalogIngredientId: null }, rows)?.id
    ).toBe(3);
  });

  it("does not match across units", () => {
    expect(
      matchInventoryRow({ name: "rice", unit: "g", catalogIngredientId: null }, rows)
    ).toBeNull();
  });

  it("returns null for untracked ingredients (skipped silently by callers)", () => {
    expect(
      matchInventoryRow({ name: "truffle oil", unit: "ml", catalogIngredientId: null }, rows)
    ).toBeNull();
  });
});

describe("applyDeductions", () => {
  const rows = [
    { id: 1, name: "Chicken", unit: "g", quantity: 300, catalogIngredientId: 7 },
    { id: 2, name: "Rice", unit: "cup", quantity: 5, catalogIngredientId: null },
  ];

  it("decrements matched rows and reports the remainder", () => {
    const results = applyDeductions(
      [
        { name: "chicken", unit: "g", quantity: 200, catalogIngredientId: 7, inventoryId: 1 },
        { name: "rice", unit: "cup", quantity: 2, catalogIngredientId: null, inventoryId: 2 },
      ],
      rows
    );
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ inventoryId: 1, remaining: 100, wentNegative: false });
    expect(results[1]).toMatchObject({ inventoryId: 2, remaining: 3, wentNegative: false });
  });

  it("allows negative stock as a warning, never a block", () => {
    const [result] = applyDeductions(
      [{ name: "chicken", unit: "g", quantity: 500, catalogIngredientId: 7, inventoryId: 1 }],
      rows
    );
    expect(result.remaining).toBe(-200);
    expect(result.wentNegative).toBe(true);
  });

  it("flags exactly-zero stock as a warning too", () => {
    const [result] = applyDeductions(
      [{ name: "chicken", unit: "g", quantity: 300, catalogIngredientId: 7, inventoryId: 1 }],
      rows
    );
    expect(result.remaining).toBe(0);
    expect(result.wentNegative).toBe(true);
  });

  it("ignores non-positive confirmations and unknown rows", () => {
    const results = applyDeductions(
      [
        { name: "chicken", unit: "g", quantity: 0, catalogIngredientId: 7, inventoryId: 1 },
        { name: "ghost", unit: "g", quantity: 5, catalogIngredientId: null, inventoryId: 999 },
      ],
      rows
    );
    expect(results).toHaveLength(0);
  });
});
