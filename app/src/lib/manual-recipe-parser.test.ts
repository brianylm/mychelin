import { describe, expect, it } from "vitest";
import {
  formatManualIngredientPreview,
  parseManualIngredientLine,
  parseManualRecipeScratchpad,
} from "./manual-recipe-parser";

describe("parseManualIngredientLine", () => {
  it("parses quantity-first formats", () => {
    expect(parseManualIngredientLine("3 carrots")).toMatchObject({
      name: "Carrots",
      quantity: 3,
      unit: undefined,
    });
    expect(parseManualIngredientLine("1 tsp salt")).toMatchObject({
      name: "Salt",
      quantity: 1,
      unit: "tsp",
    });
  });

  it("parses quantity in trailing parentheses", () => {
    expect(parseManualIngredientLine("Carrots (3)")).toMatchObject({
      name: "Carrots",
      quantity: 3,
      unit: undefined,
      notes: undefined,
    });
    expect(parseManualIngredientLine("Big Onions (2)")).toMatchObject({
      name: "Big Onions",
      quantity: 2,
    });
    expect(parseManualIngredientLine("Pork Twee Bah/ Streaky Pork (0.5kg)")).toMatchObject({
      name: "Pork Twee Bah/ Streaky Pork",
      quantity: 0.5,
      unit: "kg",
    });
  });

  it("parses trailing quantity+unit with an inner note", () => {
    expect(parseManualIngredientLine("Garlic (grinded) (1 tablespoon)")).toMatchObject({
      name: "Garlic",
      quantity: 1,
      unit: "tbsp",
      notes: "grinded",
    });
    expect(parseManualIngredientLine("Tao Cheo/Black Beans (not salted) (2 tablespoons)")).toMatchObject({
      name: "Tao Cheo/Black Beans",
      quantity: 2,
      unit: "tbsp",
      notes: "not salted",
    });
  });

  it("parses nested parentheticals with commas inside", () => {
    const parsed = parseManualIngredientLine(
      "Five spices (star anise, cinnamon, cloves, Sichuan pepper, ground fennel seeds) (1 handful)",
    );
    expect(parsed).toMatchObject({
      name: "Five spices",
      quantity: 1,
      unit: "handful",
      notes: "star anise, cinnamon, cloves, Sichuan pepper, ground fennel seeds",
    });
  });

  it("parses approximate quantities in parentheses", () => {
    expect(parseManualIngredientLine("Salt (to taste)")).toMatchObject({
      name: "Salt",
      quantityText: "to taste",
      approximate: true,
    });
  });

  it("falls back to name-only for bare ingredients", () => {
    expect(parseManualIngredientLine("Salt")).toMatchObject({
      name: "Salt",
    });
    expect(parseManualIngredientLine("Ajinomoto/MSG")).toMatchObject({
      name: "Ajinomoto/MSG",
    });
  });

  it("keeps treating non-quantity parens as notes", () => {
    expect(parseManualIngredientLine("Carrots (peeled)")).toMatchObject({
      name: "Carrots",
      notes: "peeled",
    });
  });
});

describe("parseManualRecipeScratchpad", () => {
  it("parses the reported ingredients block without losing items", () => {
    const text = `Ingredients:
Carrots (3)
Potatoes (3)
Big Onions (2)
Pork Twee Bah/ Streaky Pork (0.5kg)
Five spices (star anise, cinnamon, cloves, Sichuan pepper, ground fennel seeds) (1 handful)
Garlic (grinded) (1 tablespoon)
Tao Cheo/Black Beans (not salted) (2 tablespoons)
Ajinomoto/MSG
Salt`;

    const result = parseManualRecipeScratchpad(text);
    expect(result.ingredients).toHaveLength(9);
    expect(result.unclassified).toHaveLength(0);

    const names = result.ingredients.map((i) => i.name);
    expect(names).toEqual([
      "Carrots",
      "Potatoes",
      "Big Onions",
      "Pork Twee Bah/ Streaky Pork",
      "Five spices",
      "Garlic",
      "Tao Cheo/Black Beans",
      "Ajinomoto/MSG",
      "Salt",
    ]);

    expect(result.ingredients[4]).toMatchObject({
      quantity: 1,
      unit: "handful",
      notes: "star anise, cinnamon, cloves, Sichuan pepper, ground fennel seeds",
    });
  });

  it("splits comma-separated ingredients without splitting nested commas", () => {
    const text = `Ingredients:
Carrots (3), Potatoes (3)
Five spices (a, b, c) (1 handful)`;
    const result = parseManualRecipeScratchpad(text);
    expect(result.ingredients).toHaveLength(3);
    expect(result.ingredients.map((i) => i.name)).toEqual(["Carrots", "Potatoes", "Five spices"]);
  });
});

describe("formatManualIngredientPreview", () => {
  it("renders parentheses-parsed ingredients legibly", () => {
    const parsed = parseManualIngredientLine("Pork Twee Bah/ Streaky Pork (0.5kg)");
    expect(parsed).not.toBeNull();
    expect(formatManualIngredientPreview(parsed!)).toBe("0.5 kg Pork Twee Bah/ Streaky Pork");
  });
});
