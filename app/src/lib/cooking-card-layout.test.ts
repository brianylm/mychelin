import { describe, it, expect } from "vitest";
import {
  buildCookingCardLayout,
  explicitTimerText,
  formatCardAmount,
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
    expect(layout.steps).toHaveLength(3);

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
