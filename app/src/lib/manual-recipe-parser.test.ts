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

describe("parseManualRecipeScratchpad prose paragraphs", () => {
  const duckPasta = `First boil pasta in a pot of water and salt. Then separately, add olive oil into a pan and start adding your sliced duck breast and chili. Patty into the mix. Ensure you have enough olive oil. Then add four tablespoons of diced garlic and once everything is nice and mixed, you can add in your al dente pasta into the pan. Then add your washed and cut leafy greens bracket. We use Shanghai greens into the pasta water and blanch it until cooked. Once the greens are done, you can add them into the pan with the rest of the dish and show you add pasta water to kind of emulsify the entire sauce into the pasta to kind of thicken up a bit. Also add some pepper, salt and Italian herbs into the pasta for some flavoring.`;

  it("splits a one-paragraph method into steps without dropping text", () => {
    const result = parseManualRecipeScratchpad(duckPasta);
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions.length).toBeGreaterThanOrEqual(5);
    expect(result.instructions[0].content).toMatch(/^First boil pasta/);
    expect(result.instructions.at(-1)!.content).toMatch(/Italian herbs into the pasta for some flavoring\.$/);
    const joined = result.instructions.map((i) => i.content).join(" ") + " " + result.unclassified.join(" ");
    for (const phrase of ["Patty into the mix", "enough olive oil", "Shanghai greens", "emulsify"]) {
      expect(joined).toContain(phrase);
    }
  });

  it("never turns a long sentence into a name-only ingredient", () => {
    const result = parseManualRecipeScratchpad("Season with pepper, salt and herbs into the pasta for flavour.");
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(1);
  });

  it("still splits short comma lists into ingredients", () => {
    const result = parseManualRecipeScratchpad("Salt, pepper, 2 tbsp olive oil");
    expect(result.ingredients.map((i) => i.name)).toEqual(["Salt", "Pepper", "Olive oil"]);
  });
});
