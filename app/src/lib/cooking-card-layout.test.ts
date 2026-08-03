import { describe, it, expect } from "vitest";
import {
  buildCookingCardLayout,
  explicitTimerText,
  formatCardAmount,
  stepEncompassesAll,
} from "./cooking-card-layout";

const ingredients = [
  { name: "garlic", quantity: 3, unit: "clove" },
  { name: "rice", quantity: 200, unit: "g" },
  { name: "light soy sauce", quantity: 1, unit: "tbsp", approximate: true },
];

describe("formatCardAmount", () => {
  it("scales quantities like ServingScaler", () => {
    expect(formatCardAmount(ingredients[1], 2)).toBe("400 g");
    expect(formatCardAmount(ingredients[1], 0.5)).toBe("100 g");
  });

  it("pluralizes cloves", () => {
    expect(formatCardAmount(ingredients[0], 1)).toBe("3 cloves");
  });

  it("approximate ingredients keep quantityText or agak-agak", () => {
    expect(formatCardAmount(ingredients[2], 1)).toBe("agak-agak 1 tbsp");
    expect(
      formatCardAmount({ name: "salt", approximate: true, quantityText: "a pinch" }, 1)
    ).toBe("a pinch");
  });

  it("handles missing quantity", () => {
    expect(formatCardAmount({ name: "salt" }, 1)).toBe("");
    expect(formatCardAmount({ name: "salt", unit: "tsp" }, 1)).toBe("tsp");
  });
});

describe("explicitTimerText", () => {
  it("finds explicit durations", () => {
    expect(explicitTimerText("simmer 20 min until soft")).toBe("20 min");
    expect(explicitTimerText("bake for 1.5 hrs")).toBe("1.5 hrs");
    expect(explicitTimerText("rest 10-15 min")).toBe("10-15 min");
    expect(explicitTimerText("sear 30 seconds each side")).toBe("30 seconds");
  });

  it("returns null when no duration is stated", () => {
    expect(explicitTimerText("fry until golden")).toBeNull();
    expect(explicitTimerText("add 200 g rice")).toBeNull();
  });
});

describe("buildCookingCardLayout", () => {
  const instructions = [
    { content: "Fry garlic until fragrant", tip: "[heat:high] watch it" },
    { content: "Add rice and soy sauce, toss for 2 min" },
    { content: "Plate and serve" },
  ];

  it("builds rows, step columns, and the match matrix", () => {
    const layout = buildCookingCardLayout({ ingredients, instructions, scale: 2 });
    expect(layout.rows).toHaveLength(3);
    expect(layout.rows[1].amount).toBe("400 g");
    // 3 real steps + the synthetic "Combine all" column (the recipe never
    // reaches an explicit whole-pot step).
    expect(layout.steps).toHaveLength(4);
    expect(layout.steps[3].combine).toBe(true);
    expect(layout.steps[3].blockRowIndexes).toEqual([0, 1, 2]);

    expect(layout.steps[0].title).toBe("Fry");
    expect(layout.steps[0].heat).toBe("high");
    expect(layout.steps[0].matchedRowIndexes).toEqual([0]);

    expect(layout.steps[1].timerText).toBe("2 min");
    expect(layout.steps[1].matchedRowIndexes).toContain(1);

    // step with no matches still gets a column
    expect(layout.steps[2].matchedRowIndexes).toEqual([]);
  });

  it("flags empty recipes for graceful fallback", () => {
    const empty = buildCookingCardLayout({ ingredients: [], instructions: [], scale: 1 });
    expect(empty.hasIngredients).toBe(false);
    expect(empty.hasInstructions).toBe(false);

    const stepsOnly = buildCookingCardLayout({ ingredients: [], instructions, scale: 1 });
    expect(stepsOnly.hasIngredients).toBe(false);
    expect(stepsOnly.hasInstructions).toBe(true);
    expect(stepsOnly.steps).toHaveLength(3);
  });
});

describe("ingredient rows reordered into per-step bands (dot matrix)", () => {
  it("groups each step's matched ingredients into a contiguous band", () => {
    const layout = buildCookingCardLayout({
      ingredients,
      instructions: [
        { content: "Fry garlic until fragrant", tip: "[heat:high] watch it" },
        { content: "Add rice and soy sauce, toss for 2 min" },
        { content: "Plate and serve" },
      ],
      scale: 1,
    });

    // Step 1's band = [garlic]; step 2's band = [rice, light soy sauce].
    expect(layout.rows.map((r) => r.name)).toEqual([
      "garlic",
      "rice",
      "light soy sauce",
    ]);
    expect(layout.steps[0].matchedRowIndexes).toEqual([0]);
    expect(layout.steps[1].matchedRowIndexes).toEqual([1, 2]);
    expect(layout.steps[2].matchedRowIndexes).toEqual([]);
  });

  it("reorders rows so a step that uses several ingredients gets a full dot column", () => {
    const layout = buildCookingCardLayout({
      ingredients: [
        { name: "oyster sauce", quantity: 1, unit: "tbsp" },
        { name: "rice", quantity: 200, unit: "g" },
        { name: "garlic", quantity: 2, unit: "clove" },
      ],
      instructions: [
        { content: "Fry garlic until fragrant" },
        { content: "Add rice and oyster sauce, toss" },
      ],
      scale: 1,
    });

    // Step 1's band (garlic) first, then step 2's band (oyster sauce, rice).
    expect(layout.rows.map((r) => r.name)).toEqual([
      "garlic",
      "oyster sauce",
      "rice",
    ]);
    expect(layout.steps[1].matchedRowIndexes).toEqual([1, 2]);
  });

  it("sends unreferenced ingredients to a trailing band", () => {
    const layout = buildCookingCardLayout({
      ingredients: [
        { name: "garlic", quantity: 2, unit: "clove" },
        { name: "salt" },
      ],
      instructions: [{ content: "Fry garlic" }],
      scale: 1,
    });

    expect(layout.rows.map((r) => r.name)).toEqual(["garlic", "salt"]);
    expect(layout.steps[0].matchedRowIndexes).toEqual([0]);
  });
});

describe("stepEncompassesAll", () => {
  it("fires on whole-dish phrases", () => {
    expect(stepEncompassesAll("Add everything to the pot and pressure cook 20 min")).toBe(true);
    expect(stepEncompassesAll("Mix well and serve")).toBe(true);
    expect(stepEncompassesAll("Pressure cook for 30-40 mins")).toBe(true);
    expect(stepEncompassesAll("Add the stir fried ingredients and carrots")).toBe(true);
  });

  it("does not fire when the step names specific ingredients", () => {
    expect(stepEncompassesAll("Dice carrots and potatoes to bitesize")).toBe(false);
    expect(stepEncompassesAll("Sear beef cubes on high heat")).toBe(false);
    expect(stepEncompassesAll("Add rice and soy sauce, toss for 2 min")).toBe(false);
  });
});

describe("whole-pot steps carry forward introduced ingredients", () => {
  it("a pressure-cook step covers every ingredient an earlier step introduced", () => {
    const layout = buildCookingCardLayout({
      ingredients: [
        { name: "Holland potato" },
        { name: "Beef cubes" },
        { name: "Onion" },
        { name: "Carrots" },
      ],
      instructions: [
        { content: "Dice carrots and potatoes, slice onions" },
        { content: "Sear beef cubes on high heat" },
        { content: "Add to pressure cooker with the stir fried ingredients and carrots. Pressure cook 30 mins" },
      ],
      scale: 1,
    });

    // The final step now encompasses all four prepped ingredients.
    expect(layout.steps[2].matchedRowIndexes).toEqual([0, 1, 2, 3]);
  });
});

describe("merged block rows (blockRowIndexes)", () => {
  it("a step's block is its own band — contiguous, no over-claiming", () => {
    const layout = buildCookingCardLayout({
      ingredients: [
        { name: "pork belly" },
        { name: "garlic" },
        { name: "dark soy sauce" },
        { name: "light soy sauce" },
        { name: "rock sugar" },
      ],
      instructions: [
        { content: "Blanch pork belly in boiling water" },
        { content: "Fry garlic, then add pork and toss" },
        { content: "Add dark soy, light soy and rock sugar, simmer" },
      ],
      scale: 1,
    });

    // Bands are pork → garlic → the three seasonings. Step 2 re-uses pork
    // but does NOT claim its row — that block lives in step 1's band.
    expect(layout.steps[0].blockRowIndexes).toEqual([0]);
    expect(layout.steps[1].blockRowIndexes).toEqual([1]);
    expect(layout.steps[2].blockRowIndexes).toEqual([2, 3, 4]);
    expect(layout.steps[2].blockRowIndexes.every((v, i) => i === 0 || v === layout.steps[2].blockRowIndexes[i - 1] + 1)).toBe(true);
  });

  it("whole-pot steps carry forward every introduced ingredient", () => {
    const layout = buildCookingCardLayout({
      ingredients: [{ name: "potato" }, { name: "beef" }, { name: "onion" }],
      instructions: [
        { content: "Dice potatoes and onion" },
        { content: "Sear beef" },
        { content: "Add everything to the pressure cooker and pressure cook 30 mins" },
      ],
      scale: 1,
    });

    // Rows are banded [potato, onion, beef]; the final whole-pot step's
    // block spans all three.
    expect(layout.steps[2].blockRowIndexes).toEqual([0, 1, 2]);
  });
});

describe("final Combine all step", () => {
  it("appends a synthetic combine column spanning all ingredients when the recipe never combines explicitly", () => {
    const layout = buildCookingCardLayout({
      ingredients,
      instructions: [
        { content: "Fry garlic until fragrant" },
        { content: "Add rice and soy sauce, toss for 2 min" },
        { content: "Plate and serve" },
      ],
      scale: 1,
    });
    const combine = layout.steps[layout.steps.length - 1];
    expect(combine.combine).toBe(true);
    expect(combine.title).toBe("Combine all");
    expect(combine.blockRowIndexes).toEqual([0, 1, 2]);
  });

  it("does not append combine when the last step already covers every ingredient", () => {
    const layout = buildCookingCardLayout({
      ingredients: [{ name: "garlic" }, { name: "rice" }, { name: "oyster sauce" }],
      instructions: [
        { content: "Fry garlic" },
        { content: "Add rice and oyster sauce, toss" },
        { content: "Add everything and mix well" },
      ],
      scale: 1,
    });
    // Rows are banded [garlic, rice, oyster sauce]; the whole-pot step
    // covers all three, so no synthetic combine is needed.
    expect(layout.steps[layout.steps.length - 1].combine).toBeUndefined();
    expect(layout.steps[layout.steps.length - 1].blockRowIndexes).toEqual([0, 1, 2]);
  });

  it("omits combine when there are no ingredient rows", () => {
    const layout = buildCookingCardLayout({
      ingredients: [],
      instructions: [{ content: "Fry garlic until fragrant" }],
      scale: 1,
    });
    expect(layout.steps.some((s) => s.combine)).toBe(false);
  });
});
