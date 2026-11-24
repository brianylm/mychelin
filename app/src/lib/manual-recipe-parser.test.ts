import { describe, expect, it } from "vitest";
import {
  recipeToScratchpadText,
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
    expect(result.instructions).toHaveLength(1);
    // Known names are picked out of the step; no sentence-length "ingredient".
    expect(result.ingredients.map((i) => i.name)).toEqual(["Pepper", "Salt", "Herbs", "Pasta"]);
  });

  it("still splits short comma lists into ingredients", () => {
    const result = parseManualRecipeScratchpad("Salt, pepper, 2 tbsp olive oil");
    expect(result.ingredients.map((i) => i.name)).toEqual(["Salt", "Pepper", "Olive oil"]);
  });
});

describe("ingredients mentioned inside prose steps", () => {
  const chickenRice = "Okay so this is my mum's chicken rice. First you take one whole chicken, about 1.5 kg, rub it all over with coarse salt, then rinse it. Bring a big pot of water to the boil with 4 slices of ginger and two stalks of spring onion. Poach it for about 35 minutes on a gentle simmer. For the rice, fry three cloves of chopped garlic and some shallots in chicken fat until fragrant. Add 2 cups of washed jasmine rice and cook with the stock and a pandan leaf.";

  it("pulls measured ingredients out of a dictated paragraph (B's 21 Nov report)", () => {
    const result = parseManualRecipeScratchpad(chickenRice);
    expect(result.instructions.length).toBeGreaterThanOrEqual(5);
    expect(result.ingredientsFromSteps).toBe(true);
    expect(result.ingredients.map((i) => [i.quantity, i.unit, i.name, i.notes])).toEqual([
      [undefined, undefined, "Whole chicken", undefined],
      [undefined, undefined, "Salt", undefined],
      [undefined, undefined, "Water", undefined],
      [4, "slice", "Ginger", undefined],
      [2, "stalk", "Spring onion", undefined],
      [3, "clove", "Garlic", "chopped"],
      [undefined, undefined, "Shallot", undefined],
      [undefined, undefined, "Chicken fat", undefined],
      [2, "cup", "Jasmine rice", "washed"],
      [undefined, undefined, "Stock", undefined],
      [undefined, undefined, "Pandan leaves", undefined],
    ]);
  });

  it("finds the garlic in the duck pasta paragraph", () => {
    const result = parseManualRecipeScratchpad(
      "First boil pasta in a pot of water and salt. Then add four tablespoons of diced garlic and toss."
    );
    expect(result.ingredients.map((i) => i.name)).toEqual(["Pasta", "Water", "Salt", "Garlic"]);
    expect(result.ingredients[3]).toMatchObject({ quantity: 4, unit: "tbsp", notes: "diced" });
  });

  it("handles compact amounts and a/half", () => {
    const result = parseManualRecipeScratchpad(
      "Marinate 500g pork belly with a tablespoon of light soy. Then add half a cup of water."
    );
    expect(result.ingredients.map((i) => [i.quantity, i.unit, i.name])).toEqual([
      [500, "g", "Pork belly"],
      [1, "tbsp", "Light soy"],
      [0.5, "cup", "Water"],
    ]);
  });

  it("ignores durations, cut counts and units with no ingredient", () => {
    const result = parseManualRecipeScratchpad(
      "Simmer for 20 minutes. Cut the chicken into 4 pieces. Then slice into 2 slices, then serve."
    );
    // Only the named chicken, with no amount taken from "4 pieces".
    expect(result.ingredients.map((i) => [i.name, i.quantity])).toEqual([["Chicken", undefined]]);
  });

  it("reads 'cloves of garlic' as garlic, not the spice, and skips the ice bath", () => {
    const result = parseManualRecipeScratchpad(
      "Fry 3 cloves of garlic until fragrant. Then plunge into an ice bath and add two cloves."
    );
    expect(result.ingredients.map((i) => i.name)).toEqual(["Garlic"]);
  });

  it("keeps the spice when cloves are an ingredient", () => {
    const result = parseManualRecipeScratchpad("Braise the pork with star anise and cloves for an hour.");
    expect(result.ingredients.map((i) => i.name)).toEqual(["Pork", "Star anise", "Cloves"]);
  });

  it("keeps chicken fat apart from chicken and drops generic repeats", () => {
    const result = parseManualRecipeScratchpad(
      "Fry the garlic in chicken fat. Add the chicken and the rice. Then add 2 cups jasmine rice."
    );
    expect(result.ingredients.map((i) => i.name)).toEqual(["Garlic", "Chicken fat", "Chicken", "Jasmine rice"]);
  });

  it("maps spoken variants to one name", () => {
    const result = parseManualRecipeScratchpad("Boil with a pandan leaf and some scallions. Serve with chilli sauce.");
    expect(result.ingredients.map((i) => i.name)).toEqual(["Pandan leaves", "Spring onion", "Chili sauce"]);
  });

  it("merges repeat mentions of the same ingredient", () => {
    const result = parseManualRecipeScratchpad("Add 1 tbsp oil and fry. Then add 1 tbsp oil again.");
    expect(result.ingredients).toHaveLength(1);
  });

  it("does not add step mentions when an ingredient list exists", () => {
    const result = parseManualRecipeScratchpad("Ingredients\n3 garlic cloves\n\nSteps\nFry 3 cloves of garlic until fragrant.");
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].name).toBe("Garlic");
    expect(result.ingredientsFromSteps).toBe(false);
  });
});

describe("recipeToScratchpadText", () => {
  it("writes an AI recipe back as text the parser reads losslessly", () => {
    const text = recipeToScratchpadText({
      ingredients: [
        { name: "garlic", quantity: 3, unit: "cloves", notes: "chopped" },
        { name: "coarse salt", quantity: null, unit: null, notes: "" },
        { name: "jasmine rice", quantity: 2, unit: "cups", notes: "" },
      ],
      instructions: [
        { stepNumber: 1, content: "Rub the chicken with salt." },
        { stepNumber: 2, content: "Poach 35 minutes on a gentle simmer." },
      ],
    });
    const parsed = parseManualRecipeScratchpad(text);
    expect(parsed.ingredients.map((i) => i.name)).toEqual(["Garlic", "Coarse salt", "Jasmine rice"]);
    expect(parsed.ingredients[0]).toMatchObject({ quantity: 3, unit: "clove", notes: "chopped" });
    expect(parsed.instructions.map((i) => i.content)).toEqual([
      "Rub the chicken with salt.",
      "Poach 35 minutes on a gentle simmer.",
    ]);
  });

  it("skips empty rows", () => {
    expect(recipeToScratchpadText({ ingredients: [{ name: " " }], instructions: [{ content: "" }] })).toBe("");
  });
});

describe("parseManualRecipeScratchpad cleanup rules", () => {
  it("attaches prep words after a comma to the ingredient notes", () => {
    const result = parseManualRecipeScratchpad("Ingredients\n1 onion, chopped\n2 cloves garlic, finely minced\n1 tsp salt, to taste");
    expect(result.ingredients).toHaveLength(3);
    expect(result.ingredients[0]).toMatchObject({ name: "Onion", quantity: 1, notes: "chopped" });
    expect(result.ingredients[1].notes).toBe("finely minced");
    expect(result.ingredients[2].notes).toBe("to taste");
  });

  it("handles prep words without a heading", () => {
    const result = parseManualRecipeScratchpad("1 onion, chopped");
    expect(result.ingredients.map((i) => i.name)).toEqual(["Onion"]);
    expect(result.ingredients[0].notes).toBe("chopped");
  });

  it("keeps real comma lists as separate ingredients", () => {
    expect(parseManualRecipeScratchpad("Ingredients\nsalt, pepper").ingredients).toHaveLength(2);
    expect(parseManualRecipeScratchpad("Ingredients\ngarlic, ginger").ingredients).toHaveLength(2);
  });

  it("merges duplicate ingredients with the same unit", () => {
    const result = parseManualRecipeScratchpad("Ingredients\n2 tbsp soy sauce\n1 tbsp soy sauce");
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0]).toMatchObject({ name: "Soy sauce", quantity: 3, unit: "tbsp" });
  });

  it("keeps duplicates with different units", () => {
    const result = parseManualRecipeScratchpad("Ingredients\n1 tsp sugar\n1 tbsp sugar");
    expect(result.ingredients).toHaveLength(2);
  });

  it("moves Note/Tip/Enjoy lines out of the steps", () => {
    const result = parseManualRecipeScratchpad(
      "Ingredients\n1 egg\n\nSteps\nBoil the egg for 8 minutes.\nServe hot with rice.\nNote: Use fresh eggs.\nTip: add chilli.\nEnjoy!",
    );
    expect(result.instructions.map((i) => i.content)).toEqual(["Boil the egg for 8 minutes.", "Serve hot with rice."]);
    expect(result.unclassified).toEqual(["Note: Use fresh eggs.", "Tip: add chilli.", "Enjoy!"]);
  });

  it("moves trailing notes out of auto-mode prose too", () => {
    const result = parseManualRecipeScratchpad("Boil the pasta for 10 minutes. Drain and serve. Enjoy!");
    expect(result.instructions).toHaveLength(2);
    expect(result.unclassified).toEqual(["Enjoy!"]);
  });

  it("moves a final remark with no cooking verb or time, but keeps real last steps", () => {
    const remark = parseManualRecipeScratchpad("Ingredients\n1 egg\n\nSteps\nBoil the egg for 8 minutes.\nPerfect for a light lunch.");
    expect(remark.instructions).toHaveLength(1);
    expect(remark.unclassified).toEqual(["Perfect for a light lunch."]);
    const real = parseManualRecipeScratchpad("Ingredients\n1 egg\n\nSteps\nBoil the egg for 8 minutes.\nGarnish with coriander.");
    expect(real.instructions).toHaveLength(2);
  });
});

